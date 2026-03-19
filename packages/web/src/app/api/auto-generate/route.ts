import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { convert, type OutputFormat, type ConvertOptions } from "@ebook-gen/core";

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

function buildPrompt(topic: string, pages: number, lang: string): string {
  const wordCount = pages * 450; // ~450 Woerter pro Seite bei 11pt

  if (lang === "de") {
    return `Du bist ein erfahrener Sachbuch-Autor. Schreibe ein komplettes Ebook zum Thema:

"${topic}"

Anforderungen:
- Umfang: ca. ${wordCount} Woerter (ca. ${pages} Seiten)
- Sprache: Deutsch, warmherzig, empathisch aber fachlich fundiert
- Zielgruppe: Leser die praktische Hilfe suchen, keine akademische Abhandlung
- Stil: Locker, direkt, mit konkreten Tipps und Beispielen. Du-Anrede.
- Jedes Kapitel mit praktischen Aktionsschritten oder Checklisten

Struktur (als Markdown):
1. Beginne mit einem YAML-Frontmatter Block (---) mit title, subtitle, authors: [Autor], lang: de
2. Dann 5-7 Kapitel als H1 (# Kapitel...)
3. Jedes Kapitel hat 2-4 Unterabschnitte als H2 (## ...)
4. Verwende **fett** fuer wichtige Begriffe, *kursiv* fuer Betonungen
5. Verwende > Blockquotes fuer wichtige Erkenntnisse oder Zitate
6. Verwende Aufzaehlungslisten (-) fuer Tipps und Checklisten
7. Verwende nummerierte Listen (1.) fuer Schritt-fuer-Schritt Anleitungen
8. Baue mindestens 2 Tabellen ein wo sinnvoll
9. KEIN Vorwort/Einleitung als eigenes Kapitel — starte direkt mit dem ersten inhaltlichen Kapitel
10. Letztes Kapitel: Zusammenfassung + naechste Schritte

WICHTIG: Schreibe das KOMPLETTE Ebook. Nicht nur eine Gliederung. Jedes Kapitel muss vollstaendig ausformuliert sein mit ${Math.round(wordCount / 6)}-${Math.round(wordCount / 5)} Woertern pro Kapitel.

Antworte NUR mit dem Markdown-Content, keine Erklaerungen drumherum.`;
  }

  return `You are an experienced non-fiction author. Write a complete ebook on the topic:

"${topic}"

Requirements:
- Length: approximately ${wordCount} words (~${pages} pages)
- Language: ${lang === "en" ? "English" : lang}, warm, empathetic but well-researched
- Audience: readers seeking practical help, not an academic paper
- Style: Casual, direct, with concrete tips and examples
- Each chapter with practical action steps or checklists

Structure (as Markdown):
1. Start with a YAML frontmatter block (---) with title, subtitle, authors: [Author], lang: ${lang}
2. Then 5-7 chapters as H1 (# Chapter...)
3. Each chapter has 2-4 subsections as H2 (## ...)
4. Use **bold** for key terms, *italic* for emphasis
5. Use > blockquotes for key insights or quotes
6. Use bullet lists (-) for tips and checklists
7. Use numbered lists (1.) for step-by-step instructions
8. Include at least 2 tables where appropriate
9. NO foreword/introduction as a separate chapter — start with the first content chapter
10. Last chapter: Summary + next steps

IMPORTANT: Write the COMPLETE ebook. Not just an outline. Each chapter must be fully written with ${Math.round(wordCount / 6)}-${Math.round(wordCount / 5)} words per chapter.

Respond ONLY with the Markdown content, no explanations around it.`;
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
    return NextResponse.json({ error: "No topic provided" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const workDir = join(tmpdir(), `ebook-gen-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    // 1. Generate content with Claude
    const anthropic = new Anthropic({ apiKey });
    const prompt = buildPrompt(topic, pages, lang);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    const markdown =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (!markdown) {
      throw new Error("AI returned empty content");
    }

    // 2. Extract frontmatter for title/authors
    const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    let title = topic;
    let subtitle = "";
    let authors = ["AI Generated"];

    if (fmMatch) {
      const fm = fmMatch[1];
      const titleMatch = fm.match(/title:\s*["']?(.+?)["']?\s*$/m);
      const subtitleMatch = fm.match(/subtitle:\s*["']?(.+?)["']?\s*$/m);
      const authorsMatch = fm.match(/authors:\s*\[(.+?)\]/);
      if (titleMatch) title = titleMatch[1];
      if (subtitleMatch) subtitle = subtitleMatch[1];
      if (authorsMatch)
        authors = authorsMatch[1].split(",").map((a) => a.trim());
    }

    // 3. Write markdown to temp file
    const inputPath = join(workDir, "content.md");
    await writeFile(inputPath, markdown, "utf-8");

    // 4. Convert to ebook
    const slug = title
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
      .replace(/\s+/g, "-");
    const outputPath = join(workDir, `${slug}.${format}`);

    const corePath = findCorePath();
    const fontPath = join(corePath, "fonts");

    const options: ConvertOptions = {
      input: inputPath,
      output: outputPath,
      title,
      subtitle: subtitle || undefined,
      authors,
      lang,
      template,
      paper,
      toc: true,
      tocDepth: 2,
      backPage: true,
      fontPath,
    };

    const result = await convert(options, format as OutputFormat);

    // 5. Read and return
    const outputBuffer = await readFile(result.outputPath);

    const contentTypes: Record<string, string> = {
      pdf: "application/pdf",
      epub: "application/epub+zip",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": contentTypes[format] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${slug}.${format}"`,
        "X-Generation-Time": `${result.duration}ms`,
        "X-Title": title,
        "X-Word-Count": `${markdown.split(/\s+/).length}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? (err as { stderr: string }).stderr
        : undefined;
    return NextResponse.json(
      { error: message, details: stderr },
      { status: 500 }
    );
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
