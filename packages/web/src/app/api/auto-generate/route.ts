import { NextRequest } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import { convert, generateCoverPdf, type OutputFormat, type ConvertOptions } from "@ebook-gen/core";
import { addEntry, updateEntry, saveFile, type EbookEntry } from "../library/store";
import { loadSettings } from "../settings/store";

function findCorePath(): string {
  const candidates = [
    join(process.cwd(), "packages", "core"),
    join(process.cwd(), "..", "core"),
    join(process.cwd(), "node_modules", "@ebook-gen", "core"),
  ];
  for (const p of candidates) {
    if (existsSync(join(p, "fonts"))) return p;
  }
  return candidates[0];
}

interface ChapterOutline {
  title: string;
  sections: string[];
  description: string;
  chapterStyle?: "story" | "deep-dive" | "practical" | "confrontational" | "reflective";
  epigraph?: string;
}

interface BookOutline {
  title: string;
  subtitle: string;
  coverImagePrompt: string;
  chapters: ChapterOutline[];
}

function outlinePrompt(topic: string, pages: number, lang: string): string {
  // Vary chapter count: 5–12 based on page count, with some randomness
  const base = Math.round(pages / 5);
  const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
  const numChapters = Math.max(5, Math.min(12, base + jitter));

  if (lang === "de") {
    return `Erstelle eine Gliederung fuer ein Ebook zum Thema:

"${topic}"

Das Buch soll ca. ${pages} Seiten haben mit ${numChapters} Kapiteln.

Antworte NUR mit diesem JSON-Format, nichts anderes:
{
  "title": "Buchtitel",
  "subtitle": "Untertitel",
  "coverImagePrompt": "English description for AI image generation: describe a beautiful, atmospheric book cover background image (NO text, NO letters). Example: serene zen garden with morning mist and soft sunlight",
  "chapters": [
    {
      "title": "Kapiteltitel",
      "sections": ["Abschnitt 1", "Abschnitt 2", "Abschnitt 3"],
      "description": "Kurze Beschreibung was in diesem Kapitel behandelt wird",
      "chapterStyle": "story|deep-dive|practical|confrontational|reflective",
      "epigraph": "Passendes Zitat eines bekannten Autors/Denkers — Name"
    }
  ]
}

Anforderungen:
- Titel soll catchy und professionell sein — KEIN generischer Coaching-Titel. Denke wie ein Verlags-Lektor: spezifisch, mutig, ueberraschend.
- Jedes Kapitel hat 2-4 Abschnitte (sections)
- WICHTIG: Variiere den chapterStyle zwischen den Kapiteln. Nicht jedes Kapitel gleich aufbauen!
  - "story": Eroeffnet mit einer konkreten Geschichte/Fallbeispiel, Theorie ergibt sich daraus
  - "deep-dive": Geht in die Tiefe eines Aspekts, mit Studien/Daten/Gegenargumenten
  - "practical": Hauptsaechlich Anleitungen, Werkzeuge, Schritt-fuer-Schritt
  - "confrontational": Hinterfragt gaengige Annahmen, raesoniert gegen den Mainstream
  - "reflective": Philosophisch, regt zum Nachdenken an, stellt mehr Fragen als Antworten
- Letztes Kapitel: Zusammenfassung + naechste Schritte
- KEIN Vorwort/Einleitung als eigenes Kapitel
- coverImagePrompt: Beschreibe ein stimmungsvolles Hintergrundbild fuer das Cover (auf Englisch, KEIN Text im Bild)`;
  }

  return `Create an outline for an ebook on the topic:

"${topic}"

The book should be ~${pages} pages with ${numChapters} chapters.

Respond ONLY with this JSON format, nothing else:
{
  "title": "Book Title",
  "subtitle": "Subtitle",
  "coverImagePrompt": "Description for AI image generation: a beautiful, atmospheric book cover background image (NO text, NO letters)",
  "chapters": [
    {
      "title": "Chapter Title",
      "sections": ["Section 1", "Section 2", "Section 3"],
      "description": "Brief description of what this chapter covers",
      "chapterStyle": "story|deep-dive|practical|confrontational|reflective",
      "epigraph": "Fitting quote by a known author/thinker — Name"
    }
  ]
}

Requirements:
- Title should be catchy and professional — NOT generic coaching titles. Think like a publishing editor: specific, bold, surprising.
- Each chapter has 2-4 sections
- IMPORTANT: Vary the chapterStyle between chapters. Don't make every chapter the same!
  - "story": Opens with a concrete story/case study, theory emerges from it
  - "deep-dive": Goes deep on one aspect, with studies/data/counterarguments
  - "practical": Mainly guides, tools, step-by-step
  - "confrontational": Challenges common assumptions, argues against mainstream
  - "reflective": Philosophical, thought-provoking, asks more questions than answers
- Last chapter: Summary + next steps
- NO foreword/introduction as a standalone chapter
- coverImagePrompt: describe a mood-setting background image for the cover (in English, NO text in image)`;
}

// Style instructions per chapter style — forces structural variety
const STYLE_INSTRUCTIONS: Record<string, { de: string; en: string }> = {
  story: {
    de: `STIL: Eroeffne mit einer konkreten, lebensnahen Geschichte (echte Situation, mit Dialog oder innerem Monolog). Lass die Theorie sich aus der Geschichte ergeben — nicht andersherum. Keine "Stell dir vor..."-Floskeln, sondern eine echte Szene: Ort, Person, was passiert. Der Leser soll sich wiedererkennen. Erst NACH der Geschichte kommt die Einordnung.`,
    en: `STYLE: Open with a concrete, vivid story (real situation, with dialogue or inner monologue). Let theory emerge from the story — not the other way around. No "imagine..." clichés, write a real scene: place, person, what happens. The reader should recognize themselves. Analysis comes AFTER the story.`,
  },
  "deep-dive": {
    de: `STIL: Geh in die Tiefe. Nenne konkrete Studien, Zahlen, Forschungsergebnisse (mit Jahreszahl und Forscher/Institution). Zeige auch die Gegenposition — was sagen Kritiker? Wo ist die Evidenz duenn? Der Leser soll das Gefuehl haben, etwas wirklich verstanden zu haben, nicht nur einen Ueberblick bekommen.`,
    en: `STYLE: Go deep. Name specific studies, numbers, research findings (with year and researcher/institution). Also show the counter-position — what do critics say? Where is evidence thin? The reader should feel they truly understood something, not just got an overview.`,
  },
  practical: {
    de: `STIL: Maximal praktisch. Schritt-fuer-Schritt-Anleitungen, konkrete Werkzeuge, Vorlagen, Checklisten. Wenig Theorie — direkt ins Tun. Nenne exakte Zeitangaben, Mengen, Tools. Der Leser soll nach dem Lesen sofort loslegen koennen, ohne noch etwas nachschlagen zu muessen.`,
    en: `STYLE: Maximum practicality. Step-by-step instructions, concrete tools, templates, checklists. Minimal theory — straight to action. Name exact times, amounts, tools. The reader should be able to start immediately after reading without looking anything up.`,
  },
  confrontational: {
    de: `STIL: Hinterfrage gaengige Annahmen. Beginne mit einer provokanten These oder einem verbreiteten Irrtum und zerlege ihn. Sei direkt, auch unbequem. Nenne konkret, was an populaeren Ratschlaegen falsch oder uebertrieben ist, und warum. Keine Angst vor Reibung — aber immer mit Substanz, nicht nur Provokation.`,
    en: `STYLE: Challenge common assumptions. Start with a provocative thesis or widespread misconception and dismantle it. Be direct, even uncomfortable. Name specifically what's wrong or exaggerated about popular advice, and why. Don't shy from friction — but always with substance, not just provocation.`,
  },
  reflective: {
    de: `STIL: Philosophisch und nachdenklich. Stelle mehr Fragen als du Antworten gibst. Lade den Leser ein, seine eigene Position zu finden statt deine zu uebernehmen. Nutze Gedankenexperimente, Paradoxien, unerwartete Perspektiven. Weniger "So machst du es richtig" und mehr "Was waere, wenn...?"`,
    en: `STYLE: Philosophical and reflective. Ask more questions than you give answers. Invite the reader to find their own position rather than adopting yours. Use thought experiments, paradoxes, unexpected perspectives. Less "here's how to do it right" and more "what if...?"`,
  },
};

function chapterPrompt(
  topic: string,
  bookTitle: string,
  chapter: ChapterOutline,
  chapterNum: number,
  totalChapters: number,
  wordsPerChapter: number,
  lang: string,
  previousChapterTitles: string[]
): string {
  const context = previousChapterTitles.length > 0
    ? `\nBisherige Kapitel: ${previousChapterTitles.join(", ")}`
    : "";

  const chapterStyle = chapter.chapterStyle || "practical";
  const styleInstr = STYLE_INSTRUCTIONS[chapterStyle]?.[lang === "de" ? "de" : "en"]
    || STYLE_INSTRUCTIONS.practical[lang === "de" ? "de" : "en"];

  if (lang === "de") {
    return `Du schreibst Kapitel ${chapterNum} von ${totalChapters} fuer das Ebook "${bookTitle}" zum Thema "${topic}".
${context}

Kapitel ${chapterNum}: "${chapter.title}"
Abschnitte: ${chapter.sections.join(", ")}
Beschreibung: ${chapter.description}

${styleInstr}

Anforderungen:
- Ca. ${wordsPerChapter} Wörter
- Sprache: Deutsch, Du-Anrede
- Beginne mit # ${chapter.title} als H1
- Verwende ## für Abschnitte
- KEINE Überleitung zum nächsten Kapitel am Ende
- WICHTIG: Verwende korrekte deutsche Umlaute (ä, ö, ü, ß) — NIEMALS ae, oe, ue als Ersatz

FORMATIERUNG — nutze diese Elemente gezielt (nicht alle in jedem Kapitel!):
- **fett** und *kursiv* für Betonungen
- > Blockquotes für prägnante Zitate oder Kernaussagen (1-2 pro Kapitel, kurz!)
- Listen für Aufzählungen
- Tabellen NUR wenn Daten verglichen werden (nicht erzwingen)
- Tipp-Boxen als Definition-Liste, z.B.:
  Tipp
  : Hier steht ein konkreter, praktischer Tipp den der Leser sofort umsetzen kann.
  Nutze das 1-2 Mal pro Kapitel für die wichtigsten Takeaways. Varianten: "Tipp", "Wichtig", "Achtung", "Auf einen Blick", "Praxis-Check"

VERBOTEN (das macht das Buch generisch):
- "Du bist nicht allein" oder Varianten davon
- "Stell dir vor..." als Kapiteloeffner
- "In diesem Kapitel lernst du..."
- "Lass uns gemeinsam..." / "Lass uns einen Blick werfen..."
- Saetze die mit "Es ist wichtig zu verstehen, dass..." anfangen
- Generische Coaching-Phrasen wie "alte Muster loslassen", "in deine Kraft kommen", "dein volles Potenzial entfalten"
- Unbelegte wissenschaftliche Behauptungen — wenn du eine Studie nennst, nenne Forscher + Jahr. Wenn du keine hast, formuliere ehrlich als Erfahrungswert.
- Jedes Kapitel mit einer Checkliste oder Aktionsschritten beenden — VARIIERE das Ende: manchmal eine einzelne, prägnante Frage. Manchmal eine Anekdote. Manchmal konkrete Schritte. Manchmal ein Zitat.
- Horizontale Trennlinien (---) — verwende MAXIMAL eine pro Kapitel, nur bei einem echten Themenwechsel. Nicht nach jedem Abschnitt!
- Das Kapitel MUSS vollständig sein. Schreibe es bis zum Ende durch. Kein abruptes Abbrechen.

Antworte NUR mit dem Markdown-Content dieses Kapitels.`;
  }

  return `You are writing Chapter ${chapterNum} of ${totalChapters} for the ebook "${bookTitle}" on "${topic}".
${context}

Chapter ${chapterNum}: "${chapter.title}"
Sections: ${chapter.sections.join(", ")}
Description: ${chapter.description}

${styleInstr}

Requirements:
- Approximately ${wordsPerChapter} words
- Casual, direct style — address the reader as "you"
- Start with # ${chapter.title} as H1
- Use ## for sections
- NO transition to the next chapter at the end

FORMATTING — use these elements strategically (not all in every chapter!):
- **bold** and *italic* for emphasis
- > Blockquotes for punchy quotes or key insights (1-2 per chapter, keep short!)
- Lists for enumerations
- Tables ONLY when comparing data (don't force them)
- Tip boxes as definition lists, e.g.:
  Key Takeaway
  : A concrete, actionable insight the reader can use immediately.
  Use 1-2 per chapter for the most important points. Variants: "Tip", "Important", "Warning", "At a Glance", "Quick Check"

FORBIDDEN (these make the book feel generic/AI):
- "You are not alone" or variants
- "Imagine..." as a chapter opener
- "In this chapter you will learn..."
- "Let's take a look at..." / "Let's explore..."
- Sentences starting with "It's important to understand that..."
- Generic coaching phrases like "unlock your potential", "step into your power", "embrace your journey"
- Unsubstantiated scientific claims — if you cite a study, name researcher + year. If you have none, be honest and frame it as experiential.
- Ending every chapter with a checklist or action steps — VARY the ending: sometimes a single sharp question. Sometimes an anecdote. Sometimes concrete steps. Sometimes a quote.
- Horizontal rules (---) — use AT MOST one per chapter, only for a real topic shift. Not after every section!
- The chapter MUST be complete. Write it through to the end. No abrupt cutoffs.

Respond ONLY with the Markdown content of this chapter.`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log("[auto-generate] received body:", JSON.stringify(body));
  const {
    topic,
    pages = 20,
    lang = "de",
    format = "pdf",
    template = "dark-ocean",
    paper = "a4",
    pageWidth,
    pageHeight,
    author,
    authorBio,
    coverStyle,
    headingFont: customHeadingFont,
    bodyFont: customBodyFont,
    accent: customAccent,
    coverPromptHint,
  } = body as {
    topic: string;
    pages?: number;
    lang?: string;
    format?: string;
    template?: string;
    paper?: string;
    pageWidth?: string;
    pageHeight?: string;
    author?: string;
    authorBio?: string;
    coverStyle?: string;
    headingFont?: string;
    bodyFont?: string;
    accent?: string;
    coverPromptHint?: string;
  };

  const VALID_PAGES = [5, 10, 15, 20, 30, 50];
  const VALID_LANGS = ["de", "en", "fr", "es"];
  const VALID_FORMATS = ["pdf", "epub", "docx"];
  const VALID_PAPERS = ["a4", "a5", "us-letter"];

  const topicStr = (topic || "").toString().trim();
  if (!topicStr) {
    return new Response(JSON.stringify({ error: "Bitte ein Thema eingeben" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!VALID_PAGES.includes(pages)) {
    return new Response(JSON.stringify({ error: `Invalid pages. Valid: ${VALID_PAGES.join(", ")}` }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!VALID_LANGS.includes(lang)) {
    return new Response(JSON.stringify({ error: "Invalid lang" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!VALID_FORMATS.includes(format)) {
    return new Response(JSON.stringify({ error: "Invalid format" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!VALID_PAPERS.includes(paper)) {
    return new Response(JSON.stringify({ error: "Invalid paper size" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // SSE stream for progress updates
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let streamClosed = false;

  const send = async (event: string, data: unknown) => {
    if (streamClosed) return;
    try {
      await writer.write(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    } catch {
      streamClosed = true;
    }
  };

  // SSE keepalive to prevent proxy timeout during long operations
  const keepalive = setInterval(() => {
    if (streamClosed) return;
    writer.write(encoder.encode(": keepalive\n\n")).catch(() => {
      streamClosed = true;
    });
  }, 15000);

  const closeStream = async () => {
    clearInterval(keepalive);
    if (streamClosed) return;
    streamClosed = true;
    try { await writer.close(); } catch { /* already closed */ }
  };

  // Run generation in background
  (async () => {
    const workDir = join(tmpdir(), `ebook-gen-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });
    const ebookId = randomUUID();
    const settings = await loadSettings();
    const authorName = author || settings.defaultAuthor || "AI Generated";

    // Create library entry
    const entry: EbookEntry = {
      id: ebookId,
      title: topic,
      subtitle: "",
      topic,
      authors: [authorName],
      authorBio: authorBio || undefined,
      lang,
      chapters: [],
      wordCount: 0,
      pages,
      format,
      template,
      status: "generating",
      outputFiles: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addEntry(entry);
    await send("id", { id: ebookId });

    try {
      const anthropic = new Anthropic({ apiKey });

      // Step 1: Generate outline
      await send("status", { step: "outline", message: "Gliederung wird erstellt..." });

      const outlineMsg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: outlinePrompt(topic, pages, lang) }],
      });

      const outlineText =
        outlineMsg.content[0].type === "text" ? outlineMsg.content[0].text : "";

      // Parse JSON from response (strip markdown fences if present)
      const jsonStr = outlineText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const outline: BookOutline = JSON.parse(jsonStr);

      await send("outline", {
        title: outline.title,
        subtitle: outline.subtitle,
        chapters: outline.chapters.map((c) => c.title),
        coverImagePrompt: outline.coverImagePrompt,
      });

      // Step 2a: Start cover generation in parallel (don't await yet)
      let coverPromise: Promise<Buffer | null> = Promise.resolve(null);
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (replicateToken && outline.coverImagePrompt) {
        await send("status", { step: "cover_start", message: "Cover wird generiert..." });
        const replicate = new Replicate({ auth: replicateToken });
        coverPromise = (async () => {
          try {
            const styleHint = coverPromptHint ? ` Style: ${coverPromptHint}.` : "";
            const coverPrompt = `Stunning professional book cover background image. ${outline.coverImagePrompt}.${styleHint} Ultra high quality, 8K resolution, cinematic dramatic lighting, rich color palette, atmospheric depth of field. Absolutely NO text, NO letters, NO words, NO numbers, NO titles, NO watermarks anywhere in the image. Clean composition with visual weight in the upper two-thirds, leaving the lower third slightly darker and less busy for text overlay. Professional publishing quality, suitable for Amazon KDP print book cover at 300 DPI. Shot on Hasselblad, editorial photography style.`;
            console.log("[auto-generate] generating cover...");
            const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
              input: {
                prompt: coverPrompt,
                aspect_ratio: "9:16",
                output_format: "webp",
                output_quality: 95,
                safety_tolerance: 5,
              },
            });
            const result = output;
            let imageBuffer: Buffer | null = null;
            if (result instanceof ReadableStream) {
              const reader = result.getReader();
              const chunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              imageBuffer = Buffer.concat(chunks);
            } else if (typeof result === "string") {
              const res = await fetch(result);
              imageBuffer = Buffer.from(await res.arrayBuffer());
            }
            return imageBuffer;
          } catch (e) {
            console.error("[auto-generate] cover generation failed:", e);
            return null;
          }
        })();
      }

      // Step 2b: Generate each chapter
      const wordsPerChapter = Math.round((pages * 450) / outline.chapters.length);
      const chapterTexts: string[] = [];
      const previousTitles: string[] = [];

      for (let i = 0; i < outline.chapters.length; i++) {
        const chapter = outline.chapters[i];
        console.log(`[auto-generate] chapter ${i + 1}/${outline.chapters.length}: ${chapter.title}`);
        await send("status", {
          step: "chapter",
          current: i + 1,
          total: outline.chapters.length,
          message: `Kapitel ${i + 1}/${outline.chapters.length}: ${chapter.title}`,
        });

        // Dynamic max_tokens based on expected words (1.5 tokens/word + buffer)
        const chapterMaxTokens = Math.max(4000, Math.min(Math.ceil(wordsPerChapter * 1.5) + 1000, 16000));

        const chapterMsg = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: chapterMaxTokens,
          messages: [
            {
              role: "user",
              content: chapterPrompt(
                topic,
                outline.title,
                chapter,
                i + 1,
                outline.chapters.length,
                wordsPerChapter,
                lang,
                previousTitles
              ),
            },
          ],
        });

        let chapterText =
          chapterMsg.content[0].type === "text" ? chapterMsg.content[0].text : "";

        // If truncated, request continuation
        if (chapterMsg.stop_reason === "max_tokens" || chapterMsg.stop_reason === "end_turn" && !chapterText.trimEnd().match(/[.!?»"\u201D]\s*$/)) {
          if (chapterMsg.stop_reason === "max_tokens") {
            console.log(`[auto-generate] chapter ${i + 1} truncated, requesting continuation...`);
            const contMsg = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4000,
              messages: [
                { role: "user", content: chapterPrompt(topic, outline.title, chapter, i + 1, outline.chapters.length, wordsPerChapter, lang, previousTitles) },
                { role: "assistant", content: chapterText },
                { role: "user", content: "Das Kapitel wurde abgeschnitten. Bitte schreibe es nahtlos zu Ende — beginne exakt dort wo du aufgehört hast, ohne Wiederholung. Nur der fehlende Rest." },
              ],
            });
            const contText = contMsg.content[0].type === "text" ? contMsg.content[0].text : "";
            if (contText) {
              chapterText = chapterText + "\n" + contText;
              console.log(`[auto-generate] chapter ${i + 1} continued, +${contText.split(/\s+/).length} words`);
            }
          }
        }

        // Insert epigraph after H1 heading if present
        if (chapter.epigraph) {
          const h1Match = chapterText.match(/^(#\s+.+\n)/);
          if (h1Match) {
            const epigraph = `\n> *${chapter.epigraph}*\n`;
            chapterText = chapterText.replace(h1Match[0], h1Match[0] + epigraph);
          }
        }

        // Strip excessive horizontal rules (max 2 per chapter)
        const parts = chapterText.split(/\n---\n/);
        if (parts.length > 3) {
          // Keep first 2 scene breaks, remove the rest
          chapterText = parts.slice(0, 3).join("\n---\n") + "\n" + parts.slice(3).join("\n\n");
        }

        chapterTexts.push(chapterText);
        previousTitles.push(chapter.title);

        await send("chapter_done", {
          current: i + 1,
          total: outline.chapters.length,
          words: chapterText.split(/\s+/).length,
        });
      }

      // Step 3: Assemble markdown
      console.log(`[auto-generate] all chapters done, assembling...`);
      await send("status", { step: "assemble", message: "Ebook wird zusammengefuegt..." });

      const escYaml = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, " ");
      const frontmatter = `---
title: "${escYaml(outline.title)}"
subtitle: "${escYaml(outline.subtitle)}"
authors: [${authorName}]
lang: ${lang}
---`;

      const fullMarkdown = [frontmatter, "", ...chapterTexts].join("\n\n");
      const totalWords = fullMarkdown.split(/\s+/).length;

      // Step 4: Wait for cover and convert to ebook
      await send("status", { step: "convert", message: "Cover + PDF werden generiert..." });

      const coverBuffer = await coverPromise;
      let coverImagePath: string | undefined;
      if (coverBuffer) {
        coverImagePath = join(workDir, "cover.webp");
        await writeFile(coverImagePath, coverBuffer);
        await send("status", { step: "cover_done", message: "Cover fertig! PDF wird erstellt..." });
        console.log(`[auto-generate] cover: ${coverBuffer.length} bytes`);
      }

      // Generate composed cover with typography overlay
      const corePath = findCorePath();
      const fontPath = join(corePath, "fonts");
      let composedCoverPath: string | undefined;
      if (coverBuffer && coverImagePath) {
        try {
          composedCoverPath = join(workDir, "cover-composed.pdf");
          await generateCoverPdf({
            backgroundImage: coverImagePath,
            title: outline.title,
            subtitle: outline.subtitle || undefined,
            authors: [authorName],
            publisher: settings.defaultPublisher || undefined,
            accent: customAccent || settings.accent || undefined,
            headingFont: customHeadingFont || settings.headingFont || undefined,
            bodyFont: customBodyFont || settings.bodyFont || undefined,
            coverStyle: coverStyle || undefined,
            fontPath,
            output: composedCoverPath,
          });
          await send("status", { step: "cover_composed", message: "Cover mit Typografie erstellt..." });
          console.log(`[auto-generate] composed cover generated`);
        } catch (e) {
          console.error("[auto-generate] composed cover failed:", e);
          composedCoverPath = undefined;
        }
      }

      const inputPath = join(workDir, "content.md");
      await writeFile(inputPath, fullMarkdown, "utf-8");

      const slug = outline.title
        .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
        .replace(/\s+/g, "-");
      const outputPath = join(workDir, `${slug}.${format}`);

      const baseOptions: ConvertOptions = {
        input: inputPath,
        output: outputPath,
        title: outline.title,
        coverImage: coverImagePath,
        subtitle: outline.subtitle || undefined,
        authors: [authorName],
        authorBio: authorBio || undefined,
        lang,
        template,
        paper,
        ...(pageWidth ? { pageWidth } : {}),
        ...(pageHeight ? { pageHeight } : {}),
        toc: true,
        tocDepth: 2,
        backPage: true,
        fontPath,
        publisher: settings.defaultPublisher || undefined,
        website: settings.defaultWebsite || undefined,
        theme: {
          bgPrimary: settings.bgPrimary,
          bgSecondary: settings.bgSecondary,
          bgTertiary: settings.bgTertiary,
          textPrimary: settings.textPrimary,
          textSecondary: settings.textSecondary,
          accent: settings.accent,
          headingFont: settings.headingFont,
          bodyFont: settings.bodyFont,
        },
      };

      let result;
      try {
        result = await convert(baseOptions, format as OutputFormat);
      } catch (convertErr: unknown) {
        const msg = convertErr instanceof Error ? convertErr.message : String(convertErr);
        const stderr = convertErr && typeof convertErr === "object" && "stderr" in convertErr
          ? (convertErr as { stderr: string }).stderr
          : "";
        console.error("[auto-generate] PDF conversion failed:", msg, stderr);
        // Save markdown to library anyway so user can retry
        const mdFilename = `${slug}.md`;
        await saveFile(ebookId, mdFilename, Buffer.from(fullMarkdown, "utf-8"));
        await updateEntry(ebookId, {
          title: outline.title,
          subtitle: outline.subtitle,
          chapters: outline.chapters.map((c) => c.title),
          wordCount: totalWords,
          status: "error",
          error: stderr || msg,
          markdownFile: mdFilename,
        });
        await send("error", { error: `PDF-Konvertierung fehlgeschlagen: ${stderr || msg}` });
        return;
      }

      // Also generate EPUB for KDP (parallel to saving)
      let epubFilename: string | undefined;
      if (format === "pdf") {
        try {
          const epubPath = join(workDir, `${slug}.epub`);
          await convert(
            { ...baseOptions, output: epubPath },
            "epub" as OutputFormat
          );
          epubFilename = `${slug}.epub`;
          const epubBuffer = await readFile(epubPath);
          await saveFile(ebookId, epubFilename, epubBuffer);
          console.log(`[auto-generate] EPUB generated: ${epubFilename}`);
        } catch (epubErr) {
          console.error("[auto-generate] EPUB generation failed (non-fatal):", epubErr);
        }
      }

      // Step 5: Save to library
      await send("status", { step: "saving", message: "Wird gespeichert..." });

      const outputBuffer = await readFile(result.outputPath);
      const mdFilename = `${slug}.md`;
      const outFilename = `${slug}.${format}`;

      await saveFile(ebookId, mdFilename, Buffer.from(fullMarkdown, "utf-8"));
      await saveFile(ebookId, outFilename, outputBuffer);
      if (coverBuffer) {
        await saveFile(ebookId, "cover.webp", coverBuffer);
      }
      if (composedCoverPath && existsSync(composedCoverPath)) {
        const composedBuffer = await readFile(composedCoverPath);
        await saveFile(ebookId, "cover-composed.pdf", composedBuffer);
      }

      await updateEntry(ebookId, {
        title: outline.title,
        subtitle: outline.subtitle,
        chapters: outline.chapters.map((c) => c.title),
        wordCount: totalWords,
        status: "done",
        markdownFile: mdFilename,
        outputFiles: {
          [format]: outFilename,
          ...(epubFilename ? { epub: epubFilename } : {}),
          ...(coverBuffer ? { cover: "cover.webp" } : {}),
          ...(composedCoverPath && existsSync(composedCoverPath) ? { "cover-pdf": "cover-composed.pdf" } : {}),
        },
      });

      // Step 6: Generate KDP metadata if using KDP template
      let kdpMetadata = undefined;
      if (template === "kindle-kdp") {
        try {
          await send("status", { step: "kdp", message: "KDP-Metadaten werden erstellt..." });
          const estimatedPages = Math.round(totalWords / 250);
          const spineWidthMm = (estimatedPages * 0.0572).toFixed(1);

          const kdpRes = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 5000,
            messages: [{
              role: "user",
              content: `Du bist ein Amazon KDP Publishing-Experte. Erstelle Metadaten fuer:
Titel: "${outline.title}"
Untertitel: "${outline.subtitle || ""}"
Thema: "${topic}"
Kapitel: ${outline.chapters.map((c) => c.title).join(", ")}
Geschaetzte Woerter: ${totalWords}
Geschaetzte Seiten: ${estimatedPages}

Rueckenbreite-Formel: Seiten × 0.0572mm (weisses Papier) oder Seiten × 0.0635mm (cremefarbenes Papier).
Fuer dieses Buch (weisses Papier, ${estimatedPages} Seiten): ca. ${spineWidthMm} mm.

Antworte NUR mit JSON:
{
  "description": "HTML-Beschreibung fuer Amazon (<b>,<i>,<br>,<p>,<ul>,<li>). Max 3800 Zeichen. Verkaufsstark, Hook-Satz am Anfang, Bullet Points.",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7"],
  "categories": [{"name":"Kategorie","path":"Books > ..."},{"name":"Kategorie2","path":"Books > ..."},{"name":"Kategorie3","path":"Books > ..."}],
  "pricing": {"recommendedEUR":9.99,"recommendedUSD":12.99,"reasoning":"Begruendung"},
  "searchTitle": "SEO-optimierter Amazon-Titel",
  "searchSubtitle": "SEO-optimierter Untertitel mit Keywords",
  "preflight": {
    "trimSize": "6×9 in (15.24 × 22.86 cm)",
    "interiorColor": "Schwarz-Weiss oder Standardfarbe (je nach Inhalt)",
    "paperType": "Weiss oder Creme (je nach Genre)",
    "bleed": "Kein Anschnitt oder Mit Anschnitt (je nach Bildern)",
    "spineWidth": "X mm (basierend auf ~Y Seiten) — berechne mit Formel oben",
    "coverDimensions": "Breite: X cm × Hoehe: Y cm (inkl. Anschnitt + Ruecken) — abhaengig von trimSize und spineWidth",
    "checklist": [
      "PDF mit eingebetteten Schriften",
      "Alle Bilder mind. 300 DPI",
      "Margins ueber KDP-Minimum",
      "Titel auf Cover = Titel in Metadaten",
      "AI-Inhalt bei KDP angeben",
      "Korrekturexemplar bestellen vor Veroeffentlichung"
    ]
  },
  "socialMedia": {
    "instagram": "Kurzer Instagram-Post-Text mit Emojis und Hashtags (max 2200 Zeichen)",
    "twitter": "Tweet-Text (max 280 Zeichen)",
    "facebook": "Facebook-Post (3-5 Saetze, engaging)",
    "amazonDescription": "Kurzversion der Beschreibung fuer Social Media Teilen (2-3 Saetze)"
  }
}
Keywords: 7x, max 50 Zeichen, 2-3 Woerter. Preis: min 9.99 EUR (60% Royalty).
preflight: Fuelle die Werte konkret fuer dieses Buch aus (spineWidth: ${spineWidthMm} mm fuer ${estimatedPages} Seiten weisses Papier). Berechne coverDimensions basierend auf trimSize + spineWidth + 3.2mm Anschnitt pro Seite.
socialMedia: Erstelle echte, sofort nutzbare Social-Media-Texte auf Deutsch. Instagram mit Emojis und relevanten Hashtags. Twitter kurz und praegnant. Facebook engaging mit Call-to-Action.`,
            }],
          });
          const kdpText = kdpRes.content[0].type === "text" ? kdpRes.content[0].text : "";
          const kdpJson = kdpText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          kdpMetadata = JSON.parse(kdpJson);
          await updateEntry(ebookId, { kdpMetadata });
          await send("kdp_metadata", kdpMetadata);
        } catch (e) {
          console.error("[auto-generate] KDP metadata failed:", e);
        }
      }

      // Step 7: Send result (no file data — frontend downloads via library API)
      await send("done", {
        id: ebookId,
        title: outline.title,
        subtitle: outline.subtitle,
        words: totalWords,
        chapters: outline.chapters.length,
        conversionTime: result.duration,
        filename: outFilename,
        format,
        kdpMetadata: kdpMetadata || undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[auto-generate] error:", message);
      await updateEntry(ebookId, { status: "error", error: message }).catch(() => {});
      await send("error", { error: message });
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
      await closeStream();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
