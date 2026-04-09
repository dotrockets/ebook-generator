import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { convert, type OutputFormat, type ConvertOptions } from "@ebook-gen/core";
import { getEntry, updateEntry, saveFile, loadFile } from "../store";
import { loadSettings } from "../../settings/store";

export const dynamic = "force-dynamic";

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

// POST /api/library/export — re-export an ebook in a different format
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, format, template } = body as { id: string; format: string; template?: string };

  const VALID_FORMATS = ["pdf", "epub", "docx"];
  if (!id || !format) {
    return NextResponse.json({ error: "id and format required" }, { status: 400 });
  }
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: `Invalid format. Valid: ${VALID_FORMATS.join(", ")}` }, { status: 400 });
  }

  const entry = await getEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Ebook not found" }, { status: 404 });
  }

  if (!entry.markdownFile) {
    return NextResponse.json({ error: "No markdown source saved" }, { status: 400 });
  }

  // Already have this format?
  if (entry.outputFiles[format]) {
    return NextResponse.json({ exists: true, format });
  }

  const mdBuffer = await loadFile(id, entry.markdownFile);
  if (!mdBuffer) {
    return NextResponse.json({ error: "Markdown file not found" }, { status: 404 });
  }

  const workDir = join(tmpdir(), `ebook-gen-export-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    const settings = await loadSettings();
    const markdown = mdBuffer.toString("utf-8");

    // Write markdown + cover to temp dir
    const inputPath = join(workDir, "content.md");
    await writeFile(inputPath, markdown, "utf-8");

    let coverImagePath: string | undefined;
    if (entry.outputFiles.cover) {
      const coverBuf = await loadFile(id, entry.outputFiles.cover);
      if (coverBuf) {
        coverImagePath = join(workDir, "cover.webp");
        await writeFile(coverImagePath, coverBuf);
      }
    }

    const slug = entry.title
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
      .replace(/\s+/g, "-");
    const outputPath = join(workDir, `${slug}.${format}`);

    const corePath = findCorePath();
    const fontPath = join(corePath, "fonts");

    const options: ConvertOptions = {
      input: inputPath,
      output: outputPath,
      title: entry.title,
      subtitle: entry.subtitle || undefined,
      authors: entry.authors,
      authorBio: entry.authorBio || undefined,
      lang: entry.lang,
      template: template || entry.template || "dark-ocean",
      paper: "a4",
      ...(template === "kindle-kdp" ? { pageWidth: "15.24cm", pageHeight: "22.86cm" } : {}),
      toc: true,
      tocDepth: 2,
      backPage: true,
      fontPath,
      coverImage: coverImagePath,
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

    const result = await convert(options, format as OutputFormat);

    // Save to library
    const outputBuffer = await readFile(result.outputPath);
    const outFilename = `${slug}.${format}`;
    await saveFile(id, outFilename, outputBuffer);

    await updateEntry(id, {
      outputFiles: { ...entry.outputFiles, [format]: outFilename },
    });

    return NextResponse.json({
      ok: true,
      format,
      filename: outFilename,
      duration: result.duration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? (err as { stderr: string }).stderr
        : "";
    return NextResponse.json(
      { error: stderr || message },
      { status: 500 }
    );
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
