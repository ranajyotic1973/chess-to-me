import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

let logFilePath: string | null = null;
let logFileHandle: fs.promises.FileHandle | null = null;
let logBuffer: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function getLogFilePath(): string {
  if (logFilePath) return logFilePath;
  const logDir = path.join(app.getPath("userData"), "chess-to-me", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().split('T')[0];
  logFilePath = path.join(logDir, `app-${timestamp}.log`);
  return logFilePath;
}

async function ensureLogFile(): Promise<fs.promises.FileHandle> {
  if (logFileHandle) return logFileHandle;
  const filePath = getLogFilePath();
  logFileHandle = await fs.promises.open(filePath, 'a');
  return logFileHandle;
}

function formatLogEntry(level: string, source: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] [${source}] ${message}${metaStr}`;
}

async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) return;
  try {
    const handle = await ensureLogFile();
    const content = logBuffer.join('\n') + '\n';
    await handle.write(content);
    logBuffer = [];
  } catch (err) {
    console.error('[Logger] Failed to flush logs:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushLogs().catch(err => console.error('[Logger] Flush error:', err));
  }, 100);
}

export async function logToFile(level: string, source: string, message: string, meta?: any): Promise<void> {
  const entry = formatLogEntry(level, source, message, meta);
  logBuffer.push(entry);
  console.log(entry); // Also log to console
  scheduleFlush();
}

export async function closeLogger(): Promise<void> {
  if (flushTimer) clearTimeout(flushTimer);
  await flushLogs();
  if (logFileHandle) {
    await logFileHandle.close();
    logFileHandle = null;
  }
}

export function cleanupOldLogs(): void {
  try {
    const logDir = path.join(app.getPath("userData"), "chess-to-me", "logs");
    if (!fs.existsSync(logDir)) return;

    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtime.getTime() > sevenDaysMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('[Logger] Failed to cleanup old logs:', err);
  }
}
