import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

let dataDir: string | null = null;
let settingsFile: string | null = null;

function initializePaths(): void {
  if (!dataDir) {
    dataDir = join(app.getPath("userData"), "chess-to-me");
    settingsFile = join(dataDir, "settings.json");

    // Ensure directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }
}

function getSettingsFile(): string {
  initializePaths();
  return settingsFile!;
}

interface Settings {
  stockfishPath?: string;
  lc0Path?: string;
  selectedEngine?: string;
  analysisDepth?: number;
  explainLanguage?: string;
  ollamaModel?: string;
  ollamaBaseUrl?: string;
  llmProvider?: string;
  llmApiKey?: string;
  llmModel?: string;
  [key: string]: any;
}

const DEFAULTS: Settings = {
  stockfishPath: "",
  lc0Path: "",
  selectedEngine: "lc0",
  analysisDepth: 16,
  explainLanguage: "English",
  ollamaModel: "qwen3:8b",
  ollamaBaseUrl: "http://localhost:11434/api",
  llmProvider: "ollama",
  llmApiKey: ""
};

let cachedSettings: Settings | null = null;

function loadSettings(): Settings {
  try {
    const file = getSettingsFile();
    if (!existsSync(file)) {
      return { ...DEFAULTS };
    }
    const data = JSON.parse(readFileSync(file, "utf8"));
    return { ...DEFAULTS, ...data };
  } catch (err) {
    console.error("[Settings] Failed to load settings:", err);
    return { ...DEFAULTS };
  }
}

function saveSettings(data: Settings): void {
  try {
    const file = getSettingsFile();
    writeFileSync(file, JSON.stringify(data, null, 2));
    cachedSettings = data;
  } catch (err) {
    console.error("[Settings] Failed to save settings:", err);
  }
}

export class SettingsStore {
  constructor() {
    // Don't load settings yet - defer until they're actually needed
    // to avoid calling app.getPath() before Electron is ready
  }

  get(key: string): any {
    if (!cachedSettings) {
      cachedSettings = loadSettings();
    }
    return cachedSettings[key];
  }

  set(key: string, value: any): void {
    if (!cachedSettings) {
      cachedSettings = loadSettings();
    }
    cachedSettings[key] = value;
    saveSettings(cachedSettings);
  }

  getAll(): Settings {
    if (!cachedSettings) {
      cachedSettings = loadSettings();
    }
    return { ...cachedSettings };
  }
}

export const settings = new SettingsStore();
