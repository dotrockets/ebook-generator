import { NextRequest, NextResponse } from "next/server";
import { loadLibrary, deleteEntry } from "./store";

// GET /api/library — list all ebooks
export async function GET() {
  const lib = await loadLibrary();
  return NextResponse.json(lib);
}

// DELETE /api/library?id=xxx — delete an ebook
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "No id" }, { status: 400 });
  }
  const ok = await deleteEntry(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
