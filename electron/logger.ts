import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

let logFilePath: string | null = null;
let logBuffer: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function getLogFilePath(): string {
  if (logFilePath) return logFilePath;
  try {
    const logDir = path.join(app.getPath("userData"), "chess-to-me", "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().split('T')[0];
    logFilePath = path.join(logDir, `app-${timestamp}.log`);
  } catch (err) {
    console.error('[Logger] Failed to get log path:', err);
    logFilePath = null;
  }
  return logFilePath || "";
}

function formatLogEntry(level: string, source: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] [${source}] ${message}${metaStr}`;
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;
  try {
    const filePath = getLogFilePath();
    if (!filePath) return;
    const content = logBuffer.join('\n') + '\n';
    fs.appendFileSync(filePath, content, 'utf-8');
    logBuffer = [];
  } catch (err) {
    console.error('[Logger] Failed to flush logs:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushLogs();
  }, 100);
}

export function logToFile(level: string, source: string, message: string, meta?: any): void {
  const entry = formatLogEntry(level, source, message, meta);
  logBuffer.push(entry);
  console.log(entry); // Also log to console
  scheduleFlush();
}

export function closeLogger(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushLogs();

  // Delete log file on graceful shutdown
  try {
    if (logFilePath && fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
      console.log('[Logger] Log file deleted on graceful shutdown');
    }
  } catch (err) {
    console.error('[Logger] Failed to delete log file:', err);
  }

  logFilePath = null;
  logBuffer = [];
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
