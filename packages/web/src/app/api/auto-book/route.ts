import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { loadLibrary, getEntry, type EbookEntry } from "../library/store";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const CACHE_DIR = join(DATA_DIR, "cache");
const LOG_FILE = join(CACHE_DIR, "auto-book-log.json");

interface AutoBookLog {
  runs: {
    date: string;
    idea: { title: string; demandScore: number; topic: string };
    ebookId: string | null;
    status: "started" | "done" | "error";
    error?: string;
  }[];
}

async function readLog(): Promise<AutoBookLog> {
  if (!existsSync(LOG_FILE)) return { runs: [] };
  try {
    const raw = await readFile(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { runs: [] };
  }
}

async function appendLog(run: AutoBookLog["runs"][0]): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const log = await readLog();
  log.runs.unshift(run);
  // Keep last 30 runs
  log.runs = log.runs.slice(0, 30);
  await writeFile(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
}

interface RedditIdea {
  title: string;
  subtitle: string;
  topic: string;
  category: string;
  demandScore?: number;
  demandReason?: string;
  coverSearchQuery?: string;
  [key: string]: unknown;
}

// Pen names per category — never use real name for auto-generated books
const PEN_NAMES: Record<string, string> = {
  "self-help": "Lena Bergmann",
  health: "Dr. Kathrin Sommer",
  productivity: "Markus Stein",
  finance: "Thomas Weidner",
  relationships: "Anna Lichtenberg",
  parenting: "Marie Hofmann",
  "mental-health": "Sarah Keller",
  career: "Jan Hartmann",
};
const DEFAULT_PEN_NAME = "Luisa Falkner";

// Cover design presets per category
interface CoverPreset {
  style: string;
  headingFont: string;
  bodyFont: string;
  accent: string;
  promptStyle: string;
}

const COVER_PRESETS: Record<string, CoverPreset> = {
  "self-help": {
    style: "cinematic",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans 9pt",
    accent: "#d4a574",
    promptStyle: "warm golden hour lighting, person silhouette at sunrise, inspirational, hope, soft bokeh, atmospheric fog",
  },
  health: {
    style: "bold",
    headingFont: "Montserrat",
    bodyFont: "Inter",
    accent: "#22c55e",
    promptStyle: "fresh vibrant nature, green leaves, clean water droplets, healthy food flat lay, bright natural daylight, energetic",
  },
  productivity: {
    style: "minimal",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    accent: "#3b82f6",
    promptStyle: "clean minimal desk setup, modern workspace, geometric shapes, blue accent, sharp focus, contemporary design",
  },
  finance: {
    style: "minimal",
    headingFont: "Inter",
    bodyFont: "DM Sans 9pt",
    accent: "#0d9488",
    promptStyle: "abstract financial growth chart, teal and dark blue tones, premium feel, clean geometric patterns, wealth and success",
  },
  relationships: {
    style: "editorial",
    headingFont: "Playfair Display",
    bodyFont: "DM Sans 9pt",
    accent: "#e11d48",
    promptStyle: "warm intimate setting, soft candlelight, two coffee cups, cozy atmosphere, romantic warm tones, editorial photography",
  },
  parenting: {
    style: "editorial",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans 9pt",
    accent: "#f59e0b",
    promptStyle: "warm family scene, playful colors, sunlit room, children toys, soft pastel palette, joyful bright atmosphere",
  },
  "mental-health": {
    style: "split",
    headingFont: "Cormorant Garamond",
    bodyFont: "Inter",
    accent: "#8b5cf6",
    promptStyle: "serene calm landscape, still water reflection, meditation zen stones, purple blue twilight sky, peaceful tranquil mood",
  },
  career: {
    style: "split",
    headingFont: "Montserrat",
    bodyFont: "Inter",
    accent: "#f97316",
    promptStyle: "professional modern office skyline, confident pose, urban architecture, warm orange sunset, ambitious upward perspective",
  },
};

const DEFAULT_PRESET: CoverPreset = {
  style: "cinematic",
  headingFont: "Playfair Display",
  bodyFont: "DM Sans 9pt",
  accent: "#e67300",
  promptStyle: "dramatic cinematic lighting, atmospheric depth, rich color palette, editorial photography",
};

async function sendNotificationEmail(ebook: EbookEntry): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.TO_EMAIL || "mail@bjoernpuls.com";
  if (!resendKey) {
    console.log("[auto-book] RESEND_API_KEY not set, skipping email");
    return;
  }

  const domain = process.env.DOMAIN || "ebookgenerator.puls.io";
  const downloadBase = `https://${domain}/api/library/download?id=${ebook.id}`;
  const kdp = ebook.kdpMetadata;

  const subject = `Neues Auto-Book: "${ebook.title}" — KDP-ready!`;
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Neues Auto-Book generiert</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Reddit-Scanner → AI → KDP-ready PDF + EPUB</p>
  </div>
  <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h2 style="margin: 0 0 4px; font-size: 22px; color: #111;">${ebook.title}</h2>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 15px;">${ebook.subtitle || ""}</p>
      <div style="font-size: 13px; color: #6b7280;">
        ${ebook.wordCount?.toLocaleString("de-DE") || "?"} Woerter · ${ebook.chapters?.length || "?"} Kapitel · ${ebook.authors?.join(", ")}
      </div>
    </div>
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px;">Downloads</h3>
      <p style="margin: 4px 0;"><a href="${downloadBase}&format=pdf" style="color: #8b5cf6;">PDF herunterladen</a></p>
      ${ebook.outputFiles?.epub ? `<p style="margin: 4px 0;"><a href="${downloadBase}&format=epub" style="color: #8b5cf6;">EPUB herunterladen</a></p>` : ""}
      <p style="margin: 4px 0;"><a href="${downloadBase}&format=md" style="color: #8b5cf6;">Markdown herunterladen</a></p>
      ${ebook.outputFiles?.["cover-pdf"] ? `<p style="margin: 4px 0;"><a href="${downloadBase}&format=cover-composed" style="color: #8b5cf6;">Cover PDF herunterladen</a></p>` : ""}
    </div>
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px;">Kapitel</h3>
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        ${(ebook.chapters || []).map((c) => `<li>${c}</li>`).join("")}
      </ol>
    </div>
    ${kdp ? `
    <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #8b5cf6; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; color: #8b5cf6;">KDP Metadaten (Copy/Paste)</h3>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">TITEL</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${kdp.searchTitle || ebook.title}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">UNTERTITEL</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${kdp.searchSubtitle || ebook.subtitle || ""}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">BESCHREIBUNG</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${(kdp.description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">KEYWORDS</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${(kdp.keywords || []).join(" | ")}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">KATEGORIEN</p>
        ${(kdp.categories || []).map((c) => `<div style="background: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 4px;">${c.path || c.name}</div>`).join("")}
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">PREIS</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px;">
          ${kdp.pricing?.recommendedEUR || "?"} EUR / ${kdp.pricing?.recommendedUSD || "?"} USD
        </div>
      </div>
      ${kdp.preflight ? `
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">DRUCKDATEN</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px;">
          Trim: ${kdp.preflight.trimSize} · Spine: ${kdp.preflight.spineWidth} · Cover: ${kdp.preflight.coverDimensions}
        </div>
      </div>` : ""}
    </div>` : ""}
    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
      Auto-generiert von ebook-gen · Reddit → Claude → Typst → KDP
    </p>
  </div>
</div>`;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "ebook-gen <send@herzschlag-der-erde.de>",
        to: [toEmail],
        subject,
        html,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(data));
    console.log(`[auto-book] email sent to ${toEmail}: ${data.id}`);
  } catch (err) {
    console.error("[auto-book] email failed:", err);
  }
}

interface RedditCache {
  ideas: RedditIdea[];
  posts: unknown[];
  timestamp: number;
}

async function getRedditIdeas(): Promise<RedditIdea[]> {
  const cacheFile = join(CACHE_DIR, "reddit-scan.json");
  if (!existsSync(cacheFile)) return [];
  try {
    const raw = await readFile(cacheFile, "utf-8");
    const cache: RedditCache = JSON.parse(raw);
    return cache.ideas || [];
  } catch {
    return [];
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function triggerAutoGenerate(
  idea: RedditIdea
): Promise<string | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const penName = PEN_NAMES[idea.category] || DEFAULT_PEN_NAME;
  const preset = COVER_PRESETS[idea.category] || DEFAULT_PRESET;

  console.log(
    `[auto-book] triggering: "${idea.title}" (demand: ${idea.demandScore}, author: ${penName}, cover: ${preset.style})`
  );

  try {
    const resp = await fetch(`${baseUrl}/api/auto-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: idea.topic,
        pages: 50,
        lang: "de",
        format: "pdf",
        template: "kindle-kdp",
        paper: "a4",
        pageWidth: "15.24cm",
        pageHeight: "22.86cm",
        author: penName,
        coverStyle: preset.style,
        headingFont: preset.headingFont,
        bodyFont: preset.bodyFont,
        accent: preset.accent,
        coverPromptHint: preset.promptStyle,
      }),
    });

    if (!resp.ok || !resp.body) {
      console.error("[auto-book] auto-generate failed:", resp.status);
      return null;
    }

    // Read the SSE stream to find the ebook ID and wait for completion
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let ebookId: string | null = null;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: id")) {
          // Next data line has the ID
        } else if (line.startsWith("data: ") && !ebookId) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.id) ebookId = data.id;
          } catch {
            // not JSON or no id
          }
        } else if (line.startsWith("event: done")) {
          // Generation complete
          reader.cancel();
          return ebookId;
        } else if (line.startsWith("event: error")) {
          reader.cancel();
          return null;
        }
      }
    }

    return ebookId;
  } catch (err) {
    console.error("[auto-book] fetch error:", err);
    return null;
  }
}

// GET: show auto-book status and history
export async function GET() {
  const log = await readLog();
  const ideas = await getRedditIdeas();

  return NextResponse.json({
    lastRun: log.runs[0] || null,
    history: log.runs.slice(0, 10),
    nextIdea: ideas[0]
      ? {
          title: ideas[0].title,
          demandScore: ideas[0].demandScore,
          demandReason: ideas[0].demandReason,
        }
      : null,
    totalIdeas: ideas.length,
  });
}

// POST: pick top idea and generate a book
export async function POST(request: NextRequest) {
  // Optional: pass a secret to prevent unauthorized triggers
  const secret = request.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.AUTO_BOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get Reddit ideas
  const ideas = await getRedditIdeas();
  if (ideas.length === 0) {
    return NextResponse.json(
      { error: "Keine Reddit-Ideen im Cache. Erst /api/reddit-scan aufrufen." },
      { status: 404 }
    );
  }

  // 2. Sort by demand score (highest first)
  ideas.sort(
    (a, b) => (b.demandScore || 0) - (a.demandScore || 0)
  );

  // 3. Check library for duplicates (fuzzy title match)
  const library = await loadLibrary();
  const existingTitles = new Set(
    library.map((e) => normalizeTitle(e.title))
  );
  const existingTopics = new Set(
    library.map((e) => normalizeTitle(e.topic))
  );

  const bestIdea = ideas.find(
    (idea) =>
      !existingTitles.has(normalizeTitle(idea.title)) &&
      !existingTopics.has(normalizeTitle(idea.topic))
  );

  if (!bestIdea) {
    return NextResponse.json(
      {
        error: "Alle Reddit-Ideen wurden bereits generiert. Warte auf neuen Reddit-Scan.",
        existingBooks: library.length,
        ideasChecked: ideas.length,
      },
      { status: 409 }
    );
  }

  console.log(
    `[auto-book] picked: "${bestIdea.title}" (demand: ${bestIdea.demandScore})`
  );

  // 4. Log the run as started
  const run: AutoBookLog["runs"][0] = {
    date: new Date().toISOString(),
    idea: {
      title: bestIdea.title,
      demandScore: bestIdea.demandScore || 0,
      topic: bestIdea.topic,
    },
    ebookId: null,
    status: "started",
  };
  await appendLog(run);

  // 5. Trigger auto-generate and wait for completion
  const ebookId = await triggerAutoGenerate(bestIdea);

  // 6. Update log
  run.ebookId = ebookId;
  run.status = ebookId ? "done" : "error";
  if (!ebookId) run.error = "auto-generate returned no ID";
  const log = await readLog();
  if (log.runs[0]?.date === run.date) {
    log.runs[0] = run;
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
  }

  if (ebookId) {
    console.log(`[auto-book] done! ebook ID: ${ebookId}`);

    // Send notification email with KDP metadata + download links
    const ebook = await getEntry(ebookId);
    if (ebook) {
      await sendNotificationEmail(ebook);
    }

    return NextResponse.json({
      status: "done",
      ebookId,
      idea: {
        title: bestIdea.title,
        demandScore: bestIdea.demandScore,
        demandReason: bestIdea.demandReason,
        category: bestIdea.category,
      },
    });
  }

  return NextResponse.json(
    { error: "Ebook-Generierung fehlgeschlagen", idea: bestIdea.title },
    { status: 500 }
  );
}
