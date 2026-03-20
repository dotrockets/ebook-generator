import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const CACHE_DIR = join(DATA_DIR, "cache");
const CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

function cacheFile(lang: string, category: string) {
  return join(CACHE_DIR, `suggestions-${lang}-${category}.json`);
}

interface CacheEntry {
  data: unknown[];
  timestamp: number;
}

async function readCache(
  lang: string,
  category: string
): Promise<CacheEntry | null> {
  const file = cacheFile(lang, category);
  if (!existsSync(file)) return null;
  try {
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(
  lang: string,
  category: string,
  data: unknown[]
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const entry: CacheEntry = { data, timestamp: Date.now() };
  await writeFile(cacheFile(lang, category), JSON.stringify(entry), "utf-8");
}

function buildPrompt(lang: string, categoryFilter: string): string {
  if (lang === "de") {
    return `Du bist ein Ebook-Marktforscher und Buchcover-Designer. Generiere 6 Vorschlaege fuer kleine Ratgeber-Ebooks (ca. 10 Seiten), die aktuell gefragt sind und sich gut verkaufen wuerden.
${categoryFilter}

Denke an:
- Aktuelle Trends und Probleme die Menschen haben (2025/2026)
- Self-Help, Gesundheit, Produktivitaet, Finanzen, Beziehungen, Elternschaft, Mental Health
- Spezifische Nischen-Themen die eine klare Zielgruppe haben
- Themen die sich mit konkreten Tipps/Checklisten gut als kurzen Ratgeber umsetzen lassen

Fuer jedes Ebook erstelle auch ein Cover-Design-Konzept.

Antworte NUR mit diesem JSON-Array:
[
  {
    "title": "Buchtitel",
    "subtitle": "Untertitel",
    "topic": "Das komplette Thema als Prompt fuer den AI-Ebook-Generator (auf Deutsch, detailliert, mit Zielgruppe und Stil-Hinweisen)",
    "category": "self-help | health | productivity | finance | relationships | parenting | mental-health | career",
    "targetAudience": "Kurze Beschreibung der Zielgruppe",
    "whyItSells": "Warum sich das gerade gut verkauft (1 Satz)",
    "cover": {
      "style": "minimal | gradient | bold | elegant | playful",
      "dominantColor": "#hexcode",
      "accentColor": "#hexcode",
      "mood": "Stimmung des Covers in 2-3 Worten",
      "iconEmoji": "Ein passendes Emoji als Icon-Idee",
      "imagePrompt": "Beschreibung fuer ein AI-generiertes Cover-Bild (Englisch, fuer Replicate/DALL-E)"
    }
  }
]`;
  }

  return `You are an ebook market researcher and book cover designer. Generate 6 suggestions for small guide ebooks (~10 pages) that are currently in demand.
${categoryFilter}

Think about current trends (2025/2026), specific niche topics with clear target audiences, and topics that work well as short guides with concrete tips/checklists.

Respond ONLY with this JSON array:
[
  {
    "title": "Book Title",
    "subtitle": "Subtitle",
    "topic": "Complete topic as prompt for the AI ebook generator (detailed, with target audience and style hints)",
    "category": "self-help | health | productivity | finance | relationships | parenting | mental-health | career",
    "targetAudience": "Short description of target audience",
    "whyItSells": "Why this sells right now (1 sentence)",
    "cover": {
      "style": "minimal | gradient | bold | elegant | playful",
      "dominantColor": "#hexcode",
      "accentColor": "#hexcode",
      "mood": "Cover mood in 2-3 words",
      "iconEmoji": "A fitting emoji as icon idea",
      "imagePrompt": "Description for AI-generated cover image (English)"
    }
  }
]`;
}

async function generateSuggestions(
  lang: string,
  category: string
): Promise<unknown[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });
  const categoryFilter =
    category !== "all" ? `\nFokus auf Kategorie: ${category}` : "";

  console.log(`[suggestions] generating for ${lang}/${category}...`);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: buildPrompt(lang, categoryFilter) }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  const suggestions = JSON.parse(jsonStr);
  console.log(`[suggestions] ${suggestions.length} generated`);
  return suggestions;
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") || "de";
  const category = request.nextUrl.searchParams.get("category") || "all";
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  // 1. Try cache first (unless forced refresh)
  if (!refresh) {
    const cached = await readCache(lang, category);
    if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE) {
      // Return cached, trigger background refresh if > 30min old
      if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
        generateSuggestions(lang, category)
          .then((data) => writeCache(lang, category, data))
          .catch(() => {});
      }
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "hit" },
      });
    }
    // Stale cache — return it but refresh
    if (cached) {
      generateSuggestions(lang, category)
        .then((data) => writeCache(lang, category, data))
        .catch(() => {});
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "stale" },
      });
    }
  }

  // 2. No cache — generate fresh
  try {
    const suggestions = await generateSuggestions(lang, category);
    await writeCache(lang, category, suggestions);
    return NextResponse.json(suggestions, {
      headers: { "X-Cache": "miss" },
    });
  } catch (err: unknown) {
    // If generation fails, try returning stale cache
    const stale = await readCache(lang, category);
    if (stale) {
      return NextResponse.json(stale.data, {
        headers: { "X-Cache": "error-fallback" },
      });
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[suggestions] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
