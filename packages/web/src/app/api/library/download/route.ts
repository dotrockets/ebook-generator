import { NextRequest, NextResponse } from "next/server";
import { getEntry, loadFile } from "../store";

// GET /api/library/download?id=xxx&format=pdf
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const format = request.nextUrl.searchParams.get("format") || "pdf";
  const VALID_FORMATS = ["pdf", "epub", "docx", "md", "cover"];

  if (!id) {
    return NextResponse.json({ error: "No id" }, { status: 400 });
  }
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: `Invalid format. Valid: ${VALID_FORMATS.join(", ")}` }, { status: 400 });
  }

  const entry = await getEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = format === "md" ? entry.markdownFile : entry.outputFiles[format];
  if (!filename) {
    return NextResponse.json(
      { error: `No ${format} file available` },
      { status: 404 }
    );
  }

  const data = await loadFile(id, filename);
  if (!data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    epub: "application/epub+zip",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    md: "text/markdown",
  };

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypes[format] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
