import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const SETTINGS_FILE = join(DATA_DIR, "settings.json");

export interface Settings {
  // Author
  defaultAuthor: string;
  defaultPublisher: string;
  defaultWebsite: string;

  // Theme
  template: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;

  // Defaults
  defaultLang: string;
  defaultPaper: string;
  defaultPages: number;

  // API
  coverModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultAuthor: "Björn Puls",
  defaultPublisher: "",
  defaultWebsite: "",

  template: "dark-ocean",
  bgPrimary: "#0a2c37",
  bgSecondary: "#0e4050",
  bgTertiary: "#12576f",
  textPrimary: "#f5ead6",
  textSecondary: "#d4b87a",
  accent: "#e67300",
  headingFont: "Playfair Display",
  bodyFont: "DM Sans 9pt",

  defaultLang: "de",
  defaultPaper: "a4",
  defaultPages: 10,

  coverModel: "black-forest-labs/flux-schnell",
};

export async function loadSettings(): Promise<Settings> {
  if (!existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
  try {
    const raw = await readFile(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const merged = { ...current, ...settings };
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
