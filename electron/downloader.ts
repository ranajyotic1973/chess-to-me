import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { decompress } from "fzstd";
import Seven from "node-7z";
import { path7za as originalPath7za } from "7zip-bin";

const PUZZLE_CSV_URL       = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const PARALLEL_CONNECTIONS = 3;
const PROGRESS_INTERVAL_MS = 250;
const SOCKET_TIMEOUT_MS    = 45_000;  // abort if socket is idle for 45 s (connect + stall)
const MAX_ATTEMPTS         = 5;       // 1 initial + 4 retries

function getPath7za(): string {
  const originalPath = originalPath7za;
  if (fs.existsSync(originalPath)) return originalPath;

  if (originalPath.includes(".asar")) {
    const asarUnpackPath = originalPath.replace(/\.asar([\/\\])/, ".asar.unpacked$1");
    if (fs.existsSync(asarUnpackPath)) return asarUnpackPath;
  }
  return originalPath;
}

function backoffMs(attempt: number, retryAfterSec?: number): number {
  if (retryAfterSec) return retryAfterSec * 1000;
  return Math.min(5_000 * Math.pow(2, attempt), 60_000); // 5 s, 10 s, 20 s, 40 s, 60 s
}

// ── Low-level HTTP helpers ───────────────────────────────────────────────────

function httpsHead(url: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const req = client.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "HEAD" },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpsHead(res.headers.location).then(resolve).catch(reject);
          return;
        }
        resolve(res.headers as Record<string, string>);
      }
    );
    req.setTimeout(SOCKET_TIMEOUT_MS, () => req.destroy(new Error("HEAD request timed out")));
    req.on("error", reject);
    req.end();
  });
}

/** Download a single byte range into `dest` at `destOffset`. Retries on any error. */
async function downloadRange(
  url: string,
  start: number,
  end: number,
  dest: Buffer,
  destOffset: number,
  onBytes: (n: number) => void,
  attempt = 0
): Promise<void> {
  try {
    await downloadRangeOnce(url, start, end, dest, destOffset, onBytes);
  } catch (err: any) {
    if (attempt < MAX_ATTEMPTS - 1) {
      const retryAfterSec = err?.status === 429 ? (err.retryAfter ?? undefined) : undefined;
      const delay = backoffMs(attempt, retryAfterSec);
      console.warn(`[downloader] range ${start}-${end} failed (${err.message}), retry ${attempt + 1}/${MAX_ATTEMPTS - 1} in ${delay / 1000}s`);
      await new Promise(r => setTimeout(r, delay));
      return downloadRange(url, start, end, dest, destOffset, onBytes, attempt + 1);
    }
    throw err;
  }
}

function downloadRangeOnce(
  url: string,
  start: number,
  end: number,
  dest: Buffer,
  destOffset: number,
  onBytes: (n: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const req = client.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { Range: `bytes=${start}-${end}` }
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadRangeOnce(res.headers.location, start, end, dest, destOffset, onBytes)
            .then(resolve).catch(reject);
          return;
        }
        if (res.statusCode === 429) {
          const retryAfter = parseInt(res.headers["retry-after"] || "0", 10) || undefined;
          res.resume();
          const e: any = new Error(`HTTP 429 for range ${start}-${end}`);
          e.status = 429;
          e.retryAfter = retryAfter;
          reject(e);
          return;
        }
        if (res.statusCode !== 206 && res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for range ${start}-${end}`));
          return;
        }
        let offset = destOffset;
        res.on("data", (chunk: Buffer) => {
          chunk.copy(dest, offset);
          offset += chunk.length;
          onBytes(chunk.length);
        });
        res.on("end", resolve);
        res.on("error", reject);
      }
    );
    // Abort if socket is idle (covers both initial connect and mid-stream stalls)
    req.setTimeout(SOCKET_TIMEOUT_MS, () =>
      req.destroy(new Error(`Socket idle for ${SOCKET_TIMEOUT_MS / 1000}s on range ${start}-${end}`))
    );
    req.on("error", reject);
    req.end();
  });
}

/** Single-connection fallback for servers without range support. Retries on any error. */
async function downloadSingle(
  url: string,
  onProgress?: (received: number, total: number) => void,
  attempt = 0
): Promise<{ data: Buffer; headers: Record<string, string> }> {
  try {
    return await downloadSingleOnce(url, onProgress);
  } catch (err: any) {
    if (attempt < MAX_ATTEMPTS - 1) {
      const delay = backoffMs(attempt);
      console.warn(`[downloader] single download failed (${err.message}), retry ${attempt + 1}/${MAX_ATTEMPTS - 1} in ${delay / 1000}s`);
      await new Promise(r => setTimeout(r, delay));
      return downloadSingle(url, onProgress, attempt + 1);
    }
    throw err;
  }
}

function downloadSingleOnce(
  url: string,
  onProgress?: (received: number, total: number) => void
): Promise<{ data: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadSingleOnce(res.headers.location, onProgress).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const total = parseInt(res.headers["content-length"] || "0", 10);
      let received = 0;
      let lastAt = 0;
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        received += chunk.length;
        if (onProgress) {
          const now = Date.now();
          if (now - lastAt >= PROGRESS_INTERVAL_MS) { lastAt = now; onProgress(received, total); }
        }
      });
      res.on("end", () => {
        if (onProgress) onProgress(received, total);
        resolve({ data: Buffer.concat(chunks), headers: res.headers as Record<string, string> });
      });
      res.on("error", reject);
    });
    req.setTimeout(SOCKET_TIMEOUT_MS, () =>
      req.destroy(new Error(`Socket idle for ${SOCKET_TIMEOUT_MS / 1000}s`))
    );
    req.on("error", reject);
  });
}

/**
 * Parallel range download — splits the file into PARALLEL_CONNECTIONS chunks
 * and downloads them simultaneously. Each connection gets its own throttle
 * budget from the server, so combined throughput is ~N× a single connection.
 */
async function downloadParallel(
  url: string,
  onProgress: (received: number, total: number) => void
): Promise<{ data: Buffer; headers: Record<string, string> }> {
  const headHeaders = await httpsHead(url);
  const total = parseInt(headHeaders["content-length"] || "0", 10);
  const acceptsRanges = headHeaders["accept-ranges"] === "bytes";

  if (!acceptsRanges || total === 0) {
    return downloadSingle(url, onProgress);
  }

  const dest = Buffer.allocUnsafe(total);
  let received = 0;
  let lastAt = 0;

  const chunkSize = Math.ceil(total / PARALLEL_CONNECTIONS);
  const ranges = Array.from({ length: PARALLEL_CONNECTIONS }, (_, i) => ({
    start: i * chunkSize,
    end: Math.min((i + 1) * chunkSize - 1, total - 1)
  }));

  await Promise.all(
    ranges.map(({ start, end }) =>
      downloadRange(url, start, end, dest, start, (n) => {
        received += n;
        const now = Date.now();
        if (now - lastAt >= PROGRESS_INTERVAL_MS) {
          lastAt = now;
          onProgress(received, total);
        }
      })
    )
  );

  onProgress(total, total);
  return { data: dest, headers: headHeaders };
}

// ── Puzzle DB (Lichess) ──────────────────────────────────────────────────────

export async function downloadPuzzleCsv(
  destDir: string,
  onProgress: (phase: "downloading" | "decompressing" | "importing", pct: number, msg: string) => void
): Promise<Buffer> {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  onProgress("downloading", 0, `Downloading Lichess puzzle database (${PARALLEL_CONNECTIONS} connections)…`);
  const downloadStart = Date.now();

  const { data: compressed, headers } = await downloadParallel(PUZZLE_CSV_URL, (received, total) => {
    const pct = total > 0 ? Math.min(99, Math.floor((received / total) * 100)) : 0;
    const mb = (received / 1024 / 1024).toFixed(1);
    const totalMb = total > 0 ? ` / ${(total / 1024 / 1024).toFixed(0)} MB` : "";
    const elapsedSec = (Date.now() - downloadStart) / 1000;
    const showSpeed = elapsedSec > 2 && received > 1024 * 1024;
    const speedMbs = showSpeed ? `  •  ${(received / 1024 / 1024 / elapsedSec).toFixed(1)} MB/s` : "";
    onProgress("downloading", pct, `Downloading… ${mb}${totalMb} MB${speedMbs}`);
  });

  onProgress("downloading", 100, `Downloaded ${(compressed.length / 1024 / 1024).toFixed(1)} MB`);

  const versionPath = path.join(destDir, ".version");
  const lastModified = headers["last-modified"] || new Date().toUTCString();
  fs.writeFileSync(versionPath, lastModified, "utf8");

  onProgress("decompressing", 0, "Decompressing…");
  const decompressed = decompress(new Uint8Array(compressed));
  const csvBuffer = Buffer.from(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
  onProgress("decompressing", 100, `Decompressed ${(csvBuffer.length / 1024 / 1024).toFixed(0)} MB`);

  return csvBuffer;
}

/** True when a path is a zstandard-compressed file (Lichess ships `.csv.zst`). */
export function isZstFile(filePath: string): boolean {
  return /\.zst$/i.test(filePath.trim());
}

/**
 * Read an already-downloaded Lichess puzzle file from disk and return the plain
 * CSV bytes — decompressing zstandard (`.csv.zst`) files, or reading `.csv`
 * files as-is. No network access. Mirrors the buffer that `downloadPuzzleCsv`
 * produces so the same importer can consume it.
 */
export function readLocalPuzzleCsv(
  filePath: string,
  onProgress?: (phase: "decompressing", pct: number, msg: string) => void
): Buffer {
  const raw = fs.readFileSync(filePath);
  if (!isZstFile(filePath)) return raw; // plain .csv already
  onProgress?.("decompressing", 0, "Decompressing…");
  const decompressed = decompress(new Uint8Array(raw));
  onProgress?.("decompressing", 100, `Decompressed ${(decompressed.byteLength / 1024 / 1024).toFixed(0)} MB`);
  return Buffer.from(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
}

export async function checkPuzzleUpdate(versionPath: string): Promise<{ hasUpdate: boolean; serverDate: string }> {
  const storedDate = fs.existsSync(versionPath)
    ? fs.readFileSync(versionPath, "utf8").trim()
    : "";
  const headers = await httpsHead(PUZZLE_CSV_URL);
  const serverDate = headers["last-modified"] || "";
  return { hasUpdate: !storedDate || storedDate !== serverDate, serverDate };
}

// ── Games DB (Lumbra's Gigabase 7z) ─────────────────────────────────────────

export function extract7z(
  archivePath: string,
  destDir: string,
  onProgress: (pct: number, msg: string) => void
): Promise<void> {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const path7zaResolved = getPath7za();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (Seven as any).extractFull(archivePath, destDir, {
      $bin: path7zaResolved,
      $progress: true,
      overwrite: "a",
    });

    stream.on("progress", (p: { percent: number }) => {
      onProgress(p.percent ?? 0, `Extracting… ${p.percent ?? 0}%`);
    });
    stream.on("end", () => resolve());
    stream.on("error", (err: Error) => reject(err));
  });
}

export function findPgnFiles(dir: string): string[] {
  const results: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.toLowerCase().endsWith(".pgn")) results.push(full);
    }
  };
  walk(dir);
  return results;
}
