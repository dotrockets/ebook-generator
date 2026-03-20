import { NextRequest } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { convert, type OutputFormat, type ConvertOptions } from "@ebook-gen/core";
import { addEntry, updateEntry, saveFile, type EbookEntry } from "../library/store";

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
- KEIN Vorwort/Einleitung als eigenes Kapitel`;
  }

  return `Create an outline for an ebook on the topic:

"${topic}"

The book should be ~${pages} pages with ${numChapters} chapters.

Respond ONLY with this JSON format, nothing else:
{
  "title": "Book Title",
  "subtitle": "Subtitle",
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

  if (!topic) {
    return new Response(JSON.stringify({ error: "No topic provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
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

  const closeStream = async () => {
    if (streamClosed) return;
    streamClosed = true;
    try { await writer.close(); } catch { /* already closed */ }
  };

  // Run generation in background
  (async () => {
    const workDir = join(tmpdir(), `ebook-gen-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });
    const ebookId = randomUUID();

    // Create library entry
    const entry: EbookEntry = {
      id: ebookId,
      title: topic,
      subtitle: "",
      topic,
      authors: ["AI Generated"],
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
      });

      // Step 2: Generate each chapter
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

      const frontmatter = `---
title: "${outline.title}"
subtitle: "${outline.subtitle}"
authors: [AI Generated]
lang: ${lang}
---`;

      const fullMarkdown = [frontmatter, "", ...chapterTexts].join("\n\n");
      const totalWords = fullMarkdown.split(/\s+/).length;

      // Step 4: Convert to ebook
      await send("status", { step: "convert", message: `${format.toUpperCase()} wird generiert...` });

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
        subtitle: outline.subtitle || undefined,
        authors: ["AI Generated"],
        lang,
        template,
        paper,
        toc: true,
        tocDepth: 2,
        backPage: true,
        fontPath,
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

      await updateEntry(ebookId, {
        title: outline.title,
        subtitle: outline.subtitle,
        chapters: outline.chapters.map((c) => c.title),
        wordCount: totalWords,
        status: "done",
        markdownFile: mdFilename,
        outputFiles: { [format]: outFilename },
      });

      // Step 6: Send result
      const base64 = outputBuffer.toString("base64");

      await send("done", {
        id: ebookId,
        title: outline.title,
        subtitle: outline.subtitle,
        words: totalWords,
        chapters: outline.chapters.length,
        conversionTime: result.duration,
        filename: outFilename,
        format,
        file: base64,
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
