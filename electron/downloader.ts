import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { decompress } from "fzstd";
import Seven from "node-7z";
import { path7za } from "7zip-bin";

const PUZZLE_CSV_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const PARALLEL_CONNECTIONS = 3;
const PROGRESS_INTERVAL_MS = 250;

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
    req.on("error", reject);
    req.end();
  });
}

/** Download a single byte range into `dest` at `destOffset`. Retries on 429. */
async function downloadRange(
  url: string,
  start: number,
  end: number,
  dest: Buffer,
  destOffset: number,
  onBytes: (n: number) => void,
  attempt = 0
): Promise<void> {
  const MAX_ATTEMPTS = 4;
  try {
    await downloadRangeOnce(url, start, end, dest, destOffset, onBytes);
  } catch (err: any) {
    const is429 = err?.status === 429;
    if (is429 && attempt < MAX_ATTEMPTS) {
      const retryAfterMs = (err.retryAfter ?? Math.pow(2, attempt) * 3) * 1000;
      console.warn(`[downloader] 429 on range ${start}-${end}, retrying in ${retryAfterMs / 1000}s (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, retryAfterMs));
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
          res.resume(); // drain so socket is released
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
    req.on("error", reject);
    req.end();
  });
}

/** Single-connection fallback for servers without range support. */
function downloadSingle(
  url: string,
  onProgress?: (received: number, total: number) => void
): Promise<{ data: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadSingle(res.headers.location, onProgress).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
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
    }).on("error", reject);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (Seven as any).extractFull(archivePath, destDir, {
      $bin: path7za,
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
