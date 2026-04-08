import { NextResponse } from "next/server";
import { loadLibrary } from "../library/store";

export const dynamic = "force-dynamic";

// Public API: list ebooks available for purchase
export async function GET() {
  const library = await loadLibrary();

  // Only show completed ebooks with a PDF
  const forSale = library
    .filter((e) => e.status === "done" && e.outputFiles?.pdf)
    .map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      authors: e.authors,
      chapters: e.chapters,
      wordCount: e.wordCount,
      pages: e.pages,
      category: e.kdpMetadata?.categories?.[0]?.name || null,
      description: e.kdpMetadata?.description || null,
      keywords: e.kdpMetadata?.keywords || [],
      hasCover: !!e.outputFiles?.cover,
      createdAt: e.createdAt,
    }));

  return NextResponse.json({ books: forSale, count: forSale.length });
}
