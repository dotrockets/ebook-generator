import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

// Simple file-based store — persistent across restarts via Docker volume
const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const DB_FILE = join(DATA_DIR, "library.json");

export interface EbookEntry {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  authors: string[];
  lang: string;
  chapters: string[];
  wordCount: number;
  pages: number;
  format: string;
  template: string;
  status: "generating" | "done" | "error";
  error?: string;
  /** Markdown source */
  markdownFile?: string;
  /** Generated output files */
  outputFiles: Record<string, string>; // format -> filename
  createdAt: string;
  updatedAt: string;
}

async function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function loadLibrary(): Promise<EbookEntry[]> {
  await ensureDir();
  if (!existsSync(DB_FILE)) return [];
  const raw = await readFile(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

export async function saveLibrary(entries: EbookEntry[]): Promise<void> {
  await ensureDir();
  await writeFile(DB_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function addEntry(entry: EbookEntry): Promise<void> {
  const lib = await loadLibrary();
  lib.unshift(entry);
  await saveLibrary(lib);
}

export async function updateEntry(
  id: string,
  update: Partial<EbookEntry>
): Promise<EbookEntry | null> {
  const lib = await loadLibrary();
  const idx = lib.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  lib[idx] = { ...lib[idx], ...update, updatedAt: new Date().toISOString() };
  await saveLibrary(lib);
  return lib[idx];
}

export async function getEntry(id: string): Promise<EbookEntry | null> {
  const lib = await loadLibrary();
  return lib.find((e) => e.id === id) || null;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const lib = await loadLibrary();
  const idx = lib.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  lib.splice(idx, 1);
  await saveLibrary(lib);
  return true;
}

/** Save a file to the data directory and return the filename */
export async function saveFile(
  id: string,
  filename: string,
  data: Buffer
): Promise<string> {
  const dir = join(DATA_DIR, "files", id);
  await mkdir(dir, { recursive: true });
  const path = join(dir, filename);
  await writeFile(path, data);
  return path;
}

/** Load a file from the data directory */
export async function loadFile(
  id: string,
  filename: string
): Promise<Buffer | null> {
  const path = join(DATA_DIR, "files", id, filename);
  if (!existsSync(path)) return null;
  return readFile(path);
}
