import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { generateCoverPdf } from "@ebook-gen/core";

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

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const backgroundImage = formData.get("backgroundImage") as File | null;
  const title = (formData.get("title") as string) || "Untitled";
  const subtitle = formData.get("subtitle") as string | null;
  const authors = (formData.get("authors") as string) || "Unknown";
  const accent = (formData.get("accent") as string) || "#e67300";
  const template = (formData.get("template") as string) || "kindle-kdp";

  if (!backgroundImage) {
    return NextResponse.json({ error: "Background image required" }, { status: 400 });
  }

  const workDir = join(tmpdir(), `cover-gen-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    // Save background image
    const bgBytes = new Uint8Array(await backgroundImage.arrayBuffer());
    const bgPath = join(workDir, "background.webp");
    await writeFile(bgPath, bgBytes);

    const corePath = findCorePath();
    const fontPath = join(corePath, "fonts");
    const outputPath = join(workDir, "cover.pdf");

    // Determine page dimensions based on template
    const isKdp = template === "kindle-kdp";

    await generateCoverPdf({
      backgroundImage: bgPath,
      title,
      subtitle: subtitle || undefined,
      authors: authors.split(",").map((a) => a.trim()),
      accent,
      fontPath,
      output: outputPath,
      ...(isKdp ? { pageWidth: "15.24cm", pageHeight: "22.86cm" } : {}),
    });

    const pdfBuffer = await readFile(outputPath);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cover.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
