import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, subtitle, topic, chapters, lang = "de", authors } = body as {
    title: string;
    subtitle?: string;
    topic: string;
    chapters: string[];
    lang?: string;
    authors?: string[];
  };

  if (!title || !topic) {
    return NextResponse.json({ error: "title and topic required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = lang === "de"
    ? `Du bist ein Amazon KDP Publishing-Experte. Erstelle alle Metadaten fuer folgendes Buch:

Titel: "${title}"
${subtitle ? `Untertitel: "${subtitle}"` : ""}
Thema: "${topic}"
Kapitel: ${chapters.join(", ")}
Autor(en): ${authors?.join(", ") || "Unbekannt"}

Erstelle folgendes als JSON (NUR JSON, nichts anderes):
{
  "description": "Buchbeschreibung fuer Amazon (HTML-formatiert mit <b>, <i>, <br>, <p>, <ul>, <li>). Max 3800 Zeichen inkl. HTML. Verkaufsstark, emotional, mit Bullet Points der Kapitel-Highlights. Beginne mit einem starken Hook-Satz.",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7"],
  "categories": [
    {"name": "Kategorie 1 auf Amazon", "path": "Books > Pfad > Zur > Kategorie"},
    {"name": "Kategorie 2 auf Amazon", "path": "Books > Pfad > Zur > Kategorie"},
    {"name": "Kategorie 3 auf Amazon", "path": "Books > Pfad > Zur > Kategorie"}
  ],
  "pricing": {
    "recommendedEUR": 9.99,
    "recommendedUSD": 12.99,
    "reasoning": "Kurze Begruendung fuer den Preis"
  },
  "searchTitle": "Optimierter Titel fuer Amazon-Suche (kann laenger sein als das Buch-Cover)",
  "searchSubtitle": "Optimierter Untertitel mit wichtigen Keywords"
}

Anforderungen:
- Keywords: 7 Stueck, je max 50 Zeichen, 2-3 Woerter pro Keyword
- Beschreibung: Verkaufsstark, nutze <b> fuer wichtige Woerter, <br> fuer Absaetze
- Kategorien: Echte Amazon-Browse-Kategorien (deutsch oder englisch je nach Markt)
- Preis: Mindestens 9.99 EUR fuer 60% Royalty`
    : `You are an Amazon KDP Publishing expert. Create all metadata for this book:

Title: "${title}"
${subtitle ? `Subtitle: "${subtitle}"` : ""}
Topic: "${topic}"
Chapters: ${chapters.join(", ")}
Author(s): ${authors?.join(", ") || "Unknown"}

Create the following as JSON (ONLY JSON, nothing else):
{
  "description": "Book description for Amazon (HTML formatted with <b>, <i>, <br>, <p>, <ul>, <li>). Max 3800 chars including HTML. Sales-focused, emotional, with bullet points of chapter highlights. Start with a strong hook sentence.",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7"],
  "categories": [
    {"name": "Category 1 on Amazon", "path": "Books > Path > To > Category"},
    {"name": "Category 2 on Amazon", "path": "Books > Path > To > Category"},
    {"name": "Category 3 on Amazon", "path": "Books > Path > To > Category"}
  ],
  "pricing": {
    "recommendedEUR": 9.99,
    "recommendedUSD": 12.99,
    "reasoning": "Brief pricing rationale"
  },
  "searchTitle": "Optimized title for Amazon search (can be longer than cover title)",
  "searchSubtitle": "Optimized subtitle with important keywords"
}

Requirements:
- Keywords: 7 total, max 50 chars each, 2-3 words per keyword
- Description: Sales-focused, use <b> for key words, <br> for line breaks
- Categories: Real Amazon browse categories
- Price: At least $9.99 for 60% royalty`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const metadata = JSON.parse(jsonStr);

    return NextResponse.json(metadata);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[kdp-metadata] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
