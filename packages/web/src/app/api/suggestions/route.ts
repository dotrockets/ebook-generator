import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") || "de";
  const category = request.nextUrl.searchParams.get("category") || "all";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const categoryFilter =
    category !== "all"
      ? `\nFokus auf Kategorie: ${category}`
      : "";

  const prompt =
    lang === "de"
      ? `Du bist ein Ebook-Marktforscher und Buchcover-Designer. Generiere 6 Vorschlaege fuer kleine Ratgeber-Ebooks (ca. 10 Seiten), die aktuell gefragt sind und sich gut verkaufen wuerden.
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
    "topic": "Das komplette Thema als Prompt fuer den AI-Ebook-Generator",
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
]`
      : `You are an ebook market researcher and book cover designer. Generate 6 suggestions for small guide ebooks (~10 pages) that are currently in demand.
${categoryFilter}

Think about:
- Current trends and problems people face (2025/2026)
- Self-help, health, productivity, finance, relationships, parenting, mental health
- Specific niche topics with a clear target audience
- Topics that work well as short guides with concrete tips/checklists

For each ebook, also create a cover design concept.

Respond ONLY with this JSON array:
[
  {
    "title": "Book Title",
    "subtitle": "Subtitle",
    "topic": "The complete topic as a prompt for the AI ebook generator",
    "category": "self-help | health | productivity | finance | relationships | parenting | mental-health | career",
    "targetAudience": "Short description of target audience",
    "whyItSells": "Why this sells right now (1 sentence)",
    "cover": {
      "style": "minimal | gradient | bold | elegant | playful",
      "dominantColor": "#hexcode",
      "accentColor": "#hexcode",
      "mood": "Cover mood in 2-3 words",
      "iconEmoji": "A fitting emoji as icon idea",
      "imagePrompt": "Description for an AI-generated cover image (English, for Replicate/DALL-E)"
    }
  }
]`;

  try {
    console.log("[suggestions] calling Claude API...");
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    console.log("[suggestions] Claude responded, parsing...");

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    const suggestions = JSON.parse(jsonStr);

    console.log(`[suggestions] ${suggestions.length} suggestions generated`);
    return NextResponse.json(suggestions);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[suggestions] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
