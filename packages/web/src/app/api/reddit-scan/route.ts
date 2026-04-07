import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const CACHE_DIR = join(DATA_DIR, "cache");
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "EbookGenRedditScanner/1.0 (Ebook Research Tool)";
const REQUEST_DELAY = 2000;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

const DEFAULT_SUBREDDITS = [
  "selfimprovement",
  "productivity",
  "Entrepreneur",
  "personalfinance",
  "getdisciplined",
  "DecidingToBeBetter",
  "mentalhealth",
  "relationships",
  "loseit",
  "Finanzen",
];

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  subreddit: string;
  url: string;
}

interface CacheEntry {
  ideas: unknown[];
  posts: RedditPost[];
  timestamp: number;
}

function cacheFile() {
  return join(CACHE_DIR, "reddit-scan.json");
}

async function readCache(): Promise<CacheEntry | null> {
  const file = cacheFile();
  if (!existsSync(file)) return null;
  try {
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCacheEntry(
  ideas: unknown[],
  posts: RedditPost[]
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const entry: CacheEntry = { ideas, posts, timestamp: Date.now() };
  await writeFile(cacheFile(), JSON.stringify(entry), "utf-8");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSubreddit(
  subreddit: string,
  sort = "hot",
  limit = 15
): Promise<RedditPost[]> {
  const url = `${REDDIT_BASE}/r/${subreddit}/${sort}.json?limit=${limit}`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) return [];

    const json = await resp.json();
    const children = json?.data?.children || [];

    return children.map(
      (child: { data: Record<string, unknown> }) => ({
        id: child.data.id as string,
        title: child.data.title as string,
        selftext: ((child.data.selftext as string) || "").slice(0, 500),
        score: child.data.score as number,
        num_comments: child.data.num_comments as number,
        subreddit,
        url: `${REDDIT_BASE}${child.data.permalink}`,
      })
    );
  } catch {
    return [];
  }
}

async function scanReddit(subreddits: string[]): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  const seen = new Set<string>();

  // Fetch in parallel batches of 3 (respect Reddit rate limits)
  for (let i = 0; i < subreddits.length; i += 3) {
    const batch = subreddits.slice(i, i + 3);
    const results = await Promise.all(
      batch.map((sub) => fetchSubreddit(sub, "hot", 15))
    );
    for (const posts of results) {
      for (const post of posts) {
        if (!seen.has(post.id) && post.score >= 10) {
          seen.add(post.id);
          allPosts.push(post);
        }
      }
    }
    if (i + 3 < subreddits.length) await sleep(REQUEST_DELAY);
  }

  allPosts.sort(
    (a, b) => b.score + b.num_comments - (a.score + a.num_comments)
  );
  return allPosts.slice(0, 50);
}

async function searchPexels(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`;
    const resp = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.photos?.[0]?.src?.portrait || null;
  } catch {
    return null;
  }
}

async function fetchCoverImages(
  ideas: Record<string, unknown>[]
): Promise<void> {
  if (!PEXELS_API_KEY) return;
  console.log("[reddit-scan] fetching Pexels cover images...");

  // Fetch in parallel batches of 4
  for (let i = 0; i < ideas.length; i += 4) {
    const batch = ideas.slice(i, i + 4);
    const results = await Promise.all(
      batch.map((idea) =>
        searchPexels((idea.coverSearchQuery as string) || (idea.title as string))
      )
    );
    results.forEach((url, j) => {
      if (url) batch[j].coverImageUrl = url;
    });
    if (i + 4 < ideas.length) await sleep(500);
  }

  const withImages = ideas.filter((i) => i.coverImageUrl).length;
  console.log(`[reddit-scan] ${withImages}/${ideas.length} cover images found`);
}

function buildAnalysisPrompt(posts: RedditPost[]): string {
  const postSummaries = posts
    .map(
      (p, i) =>
        `${i + 1}. [r/${p.subreddit}] "${p.title}" (Score: ${p.score}, ${p.num_comments} Kommentare)\n   ${p.selftext ? p.selftext.slice(0, 200) + "..." : "(kein Text)"}`
    )
    .join("\n\n");

  return `Du bist ein Ebook-Marktforscher. Analysiere diese aktuellen Reddit-Posts und identifiziere die haeufigsten Probleme, Fragen und Pain Points.

Daraus generiere 8 konkrete Ebook-Vorschlaege (ca. 10 Seiten Ratgeber), die diese echten Probleme loesen.

WICHTIG:
- Die Ebooks muessen auf DEUTSCH sein (deutscher Markt)
- Jedes Ebook muss ein konkretes Problem aus den Posts loesen
- Nenne die Reddit-Quelle/das Problem das dahinter steckt
- Nutze echte Umlaute: ä ö ü ß (NICHT ae oe ue ss)
- Bewerte jede Idee mit einem demandScore (1-100) basierend auf: Anzahl relevanter Posts, Engagement (Score + Kommentare), Aktualitaet des Problems, Kommerzielles Potenzial
- Sortiere die Ideen absteigend nach demandScore (hoechste Nachfrage zuerst)

Reddit-Posts:
${postSummaries}

Antworte NUR mit diesem JSON-Array:
[
  {
    "title": "Buchtitel (deutsch, mit echten Umlauten ä ö ü ß)",
    "subtitle": "Untertitel",
    "topic": "Das komplette Thema als Prompt fuer den AI-Ebook-Generator (auf Deutsch, detailliert, mit Zielgruppe und Stil-Hinweisen)",
    "category": "self-help | health | productivity | finance | relationships | parenting | mental-health | career",
    "targetAudience": "Kurze Beschreibung der Zielgruppe",
    "whyItSells": "Warum sich das gerade gut verkauft — mit Bezug auf das Reddit-Problem (1 Satz)",
    "redditSource": "Zusammenfassung des Reddit-Trends/Problems das die Idee inspiriert hat",
    "redditPosts": ["r/subreddit: Titel des relevanten Posts"],
    "demandScore": 85,
    "demandReason": "Kurze Begruendung warum die Nachfrage hoch/niedrig ist (Anzahl Posts, Engagement, Aktualitaet)",
    "coverSearchQuery": "2-3 englische Keywords fuer Stockfoto-Suche (z.B. 'meditation calm nature', 'finance money growth')",
    "cover": {
      "style": "minimal | gradient | bold | elegant | playful",
      "dominantColor": "#hexcode",
      "accentColor": "#hexcode",
      "mood": "Stimmung des Covers in 2-3 Worten",
      "iconEmoji": "Ein passendes Emoji als Icon-Idee",
      "imagePrompt": "Description for AI-generated cover image (English, for Replicate)"
    }
  }
]`;
}

async function analyzeWithClaude(posts: RedditPost[]): Promise<unknown[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

  console.log(`[reddit-scan] analyzing ${posts.length} posts with Claude...`);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    messages: [{ role: "user", content: buildAnalysisPrompt(posts) }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonStr = text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  const ideas = JSON.parse(jsonStr);
  console.log(`[reddit-scan] ${ideas.length} ebook ideas generated`);
  return ideas;
}

async function refreshInBackground(): Promise<void> {
  try {
    const posts = await scanReddit(DEFAULT_SUBREDDITS);
    const ideas = await analyzeWithClaude(posts);
    await fetchCoverImages(ideas as Record<string, unknown>[]);
    await writeCacheEntry(ideas, posts);
  } catch (err) {
    console.error("[reddit-scan] background refresh failed:", err);
  }
}

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!refresh) {
    const cached = await readCache();
    if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE) {
      if (Date.now() - cached.timestamp > 12 * 60 * 60 * 1000) {
        refreshInBackground();
      }
      return NextResponse.json(
        {
          ideas: cached.ideas,
          scannedAt: new Date(cached.timestamp).toISOString(),
          postsAnalyzed: cached.posts?.length || 0,
          subreddits: DEFAULT_SUBREDDITS,
        },
        { headers: { "X-Cache": "hit" } }
      );
    }
    if (cached) {
      refreshInBackground();
      return NextResponse.json(
        {
          ideas: cached.ideas,
          scannedAt: new Date(cached.timestamp).toISOString(),
          postsAnalyzed: cached.posts?.length || 0,
          subreddits: DEFAULT_SUBREDDITS,
        },
        { headers: { "X-Cache": "stale" } }
      );
    }
  }

  try {
    console.log("[reddit-scan] starting fresh scan...");
    const posts = await scanReddit(DEFAULT_SUBREDDITS);
    console.log(`[reddit-scan] fetched ${posts.length} posts`);
    const ideas = await analyzeWithClaude(posts);
    await fetchCoverImages(ideas as Record<string, unknown>[]);
    await writeCacheEntry(ideas, posts);
    return NextResponse.json(
      {
        ideas,
        scannedAt: new Date().toISOString(),
        postsAnalyzed: posts.length,
        subreddits: DEFAULT_SUBREDDITS,
      },
      { headers: { "X-Cache": "miss" } }
    );
  } catch (err: unknown) {
    const stale = await readCache();
    if (stale) {
      return NextResponse.json(
        {
          ideas: stale.ideas,
          scannedAt: new Date(stale.timestamp).toISOString(),
          postsAnalyzed: stale.posts?.length || 0,
          subreddits: DEFAULT_SUBREDDITS,
        },
        { headers: { "X-Cache": "error-fallback" } }
      );
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[reddit-scan] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
