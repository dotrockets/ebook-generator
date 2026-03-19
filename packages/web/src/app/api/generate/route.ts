import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { convert, type OutputFormat, type ConvertOptions } from "@ebook-gen/core";

function findCorePath(): string {
  // Try common locations for the core package fonts/templates
  const candidates = [
    join(process.cwd(), "packages", "core"),                    // standalone build
    join(process.cwd(), "..", "core"),                           // from packages/web
    join(process.cwd(), "node_modules", "@ebook-gen", "core"),  // node_modules
  ];
  for (const p of candidates) {
    if (existsSync(join(p, "fonts"))) return p;
  }
  return candidates[0]; // fallback
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const markdown = formData.get("markdown") as string | null;
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "Untitled";
  const subtitle = formData.get("subtitle") as string | null;
  const authors = (formData.get("authors") as string) || "Unknown";
  const format = ((formData.get("format") as string) || "pdf") as OutputFormat;
  const template = (formData.get("template") as string) || "dark-ocean";
  const lang = (formData.get("lang") as string) || "de";
  const paper = (formData.get("paper") as string) || "a4";
  const toc = formData.get("toc") !== "false";
  const coverImage = formData.get("coverImage") as File | null;

  // Get markdown content
  let content: string;
  if (file) {
    content = await file.text();
  } else if (markdown) {
    content = markdown;
  } else {
    return NextResponse.json({ error: "No content provided" }, { status: 400 });
  }

  // Create temp directory
  const workDir = join(tmpdir(), `ebook-gen-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    // Write markdown to temp file
    const inputPath = join(workDir, "content.md");
    await writeFile(inputPath, content, "utf-8");

    // Handle cover image
    let coverImagePath: string | undefined;
    if (coverImage) {
      const coverBytes = new Uint8Array(await coverImage.arrayBuffer());
      coverImagePath = join(workDir, coverImage.name);
      await writeFile(coverImagePath, coverBytes);
    }

    // Build slug for filename
    const slug = title
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
      .replace(/\s+/g, "-");
    const outputPath = join(workDir, `${slug}.${format}`);

    // Font path — resolve relative to the core package
    const corePath = findCorePath();
    const fontPath = join(corePath, "fonts");

    const options: ConvertOptions = {
      input: inputPath,
      output: outputPath,
      title,
      subtitle: subtitle || undefined,
      authors: authors.split(",").map((a) => a.trim()),
      lang,
      template,
      paper,
      toc,
      tocDepth: 2,
      backPage: true,
      coverImage: coverImagePath,
      fontPath,
    };

    const result = await convert(options, format);

    // Read the generated file
    const outputBuffer = await readFile(result.outputPath);

    // Content type mapping
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
    // Cleanup
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
