import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { decompress } from "fzstd";
import Seven from "node-7z";
import { path7za } from "7zip-bin";

const PUZZLE_CSV_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";

function httpsGet(url: string): Promise<{ data: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({
        data: Buffer.concat(chunks),
        headers: res.headers as Record<string, string>
      }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function httpsHead(url: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      resolve(res.headers as Record<string, string>);
    });
    req.on("error", reject);
    req.end();
  });
}

// ── Puzzle DB (Lichess) ──────────────────────────────────────────────────────

export async function downloadPuzzleCsv(
  destDir: string,
  onProgress: (phase: "downloading" | "decompressing" | "importing", pct: number, msg: string) => void
): Promise<string> {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  onProgress("downloading", 0, "Downloading Lichess puzzle database…");
  const { data: compressed, headers } = await httpsGet(PUZZLE_CSV_URL);
  onProgress("downloading", 100, `Downloaded ${(compressed.length / 1024 / 1024).toFixed(1)} MB`);

  const versionPath = path.join(destDir, ".version");
  const lastModified = headers["last-modified"] || new Date().toUTCString();
  fs.writeFileSync(versionPath, lastModified, "utf8");

  onProgress("decompressing", 0, "Decompressing…");
  const decompressed = decompress(new Uint8Array(compressed));
  const csvText = Buffer.from(decompressed).toString("utf8");
  onProgress("decompressing", 100, `Decompressed ${(csvText.length / 1024 / 1024).toFixed(1)} MB`);

  return csvText;
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
    // node-7z types are loose; use any for the stream
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
