import { NextRequest } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import { convert, type OutputFormat, type ConvertOptions } from "@ebook-gen/core";
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
}

interface BookOutline {
  title: string;
  subtitle: string;
  coverImagePrompt: string;
  chapters: ChapterOutline[];
}

function outlinePrompt(topic: string, pages: number, lang: string): string {
  const numChapters = Math.max(5, Math.min(8, Math.round(pages / 3)));

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
      "description": "Kurze Beschreibung was in diesem Kapitel behandelt wird"
    }
  ]
}

Anforderungen:
- Titel soll catchy und professionell sein
- Jedes Kapitel hat 2-4 Abschnitte (sections)
- Praxisorientiert, mit konkreten Tipps
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
      "description": "Brief description of what this chapter covers"
    }
  ]
}

Requirements:
- Title should be catchy and professional
- Each chapter has 2-4 sections
- Practical, with concrete tips
- coverImagePrompt: describe a mood-setting background image for the cover (in English, NO text in image)
- Last chapter: Summary + next steps
- NO foreword/introduction as a standalone chapter`;
}

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

  if (lang === "de") {
    return `Du schreibst Kapitel ${chapterNum} von ${totalChapters} fuer das Ebook "${bookTitle}" zum Thema "${topic}".
${context}

Kapitel ${chapterNum}: "${chapter.title}"
Abschnitte: ${chapter.sections.join(", ")}
Beschreibung: ${chapter.description}

Anforderungen:
- Ca. ${wordsPerChapter} Woerter
- Sprache: Deutsch, warmherzig, empathisch, fachlich fundiert
- Stil: Locker, direkt, Du-Anrede, mit konkreten Tipps und Beispielen
- Beginne mit # ${chapter.title} als H1
- Verwende ## fuer Abschnitte
- Verwende **fett**, *kursiv*, > Blockquotes, Listen, ggf. eine Tabelle
- Ende mit praktischen Aktionsschritten oder einer Checkliste
- KEINE Ueberleitung zum naechsten Kapitel am Ende

Antworte NUR mit dem Markdown-Content dieses Kapitels.`;
  }

  return `You are writing Chapter ${chapterNum} of ${totalChapters} for the ebook "${bookTitle}" on "${topic}".
${context}

Chapter ${chapterNum}: "${chapter.title}"
Sections: ${chapter.sections.join(", ")}
Description: ${chapter.description}

Requirements:
- Approximately ${wordsPerChapter} words
- Warm, empathetic, well-researched tone
- Casual, direct style with concrete tips and examples
- Start with # ${chapter.title} as H1
- Use ## for sections
- Use **bold**, *italic*, > blockquotes, lists, tables where appropriate
- End with practical action steps or a checklist
- NO transition to the next chapter at the end

Respond ONLY with the Markdown content of this chapter.`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    topic,
    pages = 20,
    lang = "de",
    format = "pdf",
    template = "dark-ocean",
    paper = "a4",
  } = body as {
    topic: string;
    pages?: number;
    lang?: string;
    format?: string;
    template?: string;
    paper?: string;
  };

  const VALID_PAGES = [5, 10, 15, 20, 30, 50];
  const VALID_LANGS = ["de", "en"];
  const VALID_FORMATS = ["pdf", "epub", "docx"];
  const VALID_PAPERS = ["a4", "a5", "us-letter"];

  if (!topic || typeof topic !== "string" || topic.length < 1 || topic.length > 500) {
    return new Response(JSON.stringify({ error: "Topic must be 1-500 characters" }), {
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
    const authorName = settings.defaultAuthor || "AI Generated";

    // Create library entry
    const entry: EbookEntry = {
      id: ebookId,
      title: topic,
      subtitle: "",
      topic,
      authors: [authorName],
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
            const coverPrompt = `Professional book cover background, ${outline.coverImagePrompt}, high quality, no text, no letters, no words, clean composition, cinematic lighting, suitable as ebook cover background`;
            console.log("[auto-generate] generating cover...");
            const output = await replicate.run("black-forest-labs/flux-schnell", {
              input: {
                prompt: coverPrompt,
                num_outputs: 1,
                aspect_ratio: "9:16",
                output_format: "webp",
                output_quality: 90,
              },
            });
            const results = output as Array<unknown>;
            if (!results?.length) return null;
            const img = results[0];
            if (img instanceof ReadableStream) {
              const reader = img.getReader();
              const chunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              return Buffer.concat(chunks);
            } else if (typeof img === "string") {
              const res = await fetch(img);
              return Buffer.from(await res.arrayBuffer());
            }
            return null;
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
        await send("status", {
          step: "chapter",
          current: i + 1,
          total: outline.chapters.length,
          message: `Kapitel ${i + 1}/${outline.chapters.length}: ${chapter.title}`,
        });

        const chapterMsg = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
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

        const chapterText =
          chapterMsg.content[0].type === "text" ? chapterMsg.content[0].text : "";
        chapterTexts.push(chapterText);
        previousTitles.push(chapter.title);

        await send("chapter_done", {
          current: i + 1,
          total: outline.chapters.length,
          words: chapterText.split(/\s+/).length,
        });
      }

      // Step 3: Assemble markdown
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

      const inputPath = join(workDir, "content.md");
      await writeFile(inputPath, fullMarkdown, "utf-8");

      const slug = outline.title
        .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
        .replace(/\s+/g, "-");
      const outputPath = join(workDir, `${slug}.${format}`);

      const corePath = findCorePath();
      const fontPath = join(corePath, "fonts");

      const options: ConvertOptions = {
        input: inputPath,
        output: outputPath,
        title: outline.title,
        coverImage: coverImagePath,
        subtitle: outline.subtitle || undefined,
        authors: [authorName],
        lang,
        template,
        paper,
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
        result = await convert(options, format as OutputFormat);
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

      await updateEntry(ebookId, {
        title: outline.title,
        subtitle: outline.subtitle,
        chapters: outline.chapters.map((c) => c.title),
        wordCount: totalWords,
        status: "done",
        markdownFile: mdFilename,
        outputFiles: {
          [format]: outFilename,
          ...(coverBuffer ? { cover: "cover.webp" } : {}),
        },
      });

      // Step 6: Generate KDP metadata if using KDP template
      let kdpMetadata = undefined;
      if (template === "kindle-kdp") {
        try {
          await send("status", { step: "kdp", message: "KDP-Metadaten werden erstellt..." });
          const kdpRes = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3000,
            messages: [{
              role: "user",
              content: `Du bist ein Amazon KDP Publishing-Experte. Erstelle Metadaten fuer:
Titel: "${outline.title}"
Untertitel: "${outline.subtitle || ""}"
Thema: "${topic}"
Kapitel: ${outline.chapters.map((c) => c.title).join(", ")}

Antworte NUR mit JSON:
{
  "description": "HTML-Beschreibung fuer Amazon (<b>,<i>,<br>,<p>,<ul>,<li>). Max 3800 Zeichen. Verkaufsstark, Hook-Satz am Anfang, Bullet Points.",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7"],
  "categories": [{"name":"Kategorie","path":"Books > ..."},{"name":"Kategorie2","path":"Books > ..."},{"name":"Kategorie3","path":"Books > ..."}],
  "pricing": {"recommendedEUR":9.99,"recommendedUSD":12.99,"reasoning":"Begruendung"},
  "searchTitle": "SEO-optimierter Amazon-Titel",
  "searchSubtitle": "SEO-optimierter Untertitel mit Keywords"
}
Keywords: 7x, max 50 Zeichen, 2-3 Woerter. Preis: min 9.99 EUR (60% Royalty).`,
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
