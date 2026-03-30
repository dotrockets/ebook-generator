import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { updateEntry, saveFile, getEntry } from "../library/store";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ebookId, imagePrompt, style } = body as {
    ebookId?: string;
    imagePrompt: string;
    style?: "landscape" | "portrait" | "square";
  };

  if (!imagePrompt || typeof imagePrompt !== "string" || imagePrompt.length > 1000) {
    return NextResponse.json({ error: "imagePrompt must be 1-1000 characters" }, { status: 400 });
  }
  if (ebookId && (typeof ebookId !== "string" || /[\/\\.]/.test(ebookId))) {
    return NextResponse.json({ error: "Invalid ebookId" }, { status: 400 });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const replicate = new Replicate({ auth: token });

    // Build the cover prompt — optimized for book covers
    const coverPrompt = `Professional book cover background, ${imagePrompt}, high quality, no text, no letters, no words, clean composition, suitable as ebook cover background`;

    console.log("[cover] generating with Replicate...");

    const aspectRatio = style === "landscape" ? "16:9" : style === "square" ? "1:1" : "9:16";

    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: coverPrompt,
        num_outputs: 1,
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: 90,
      },
    });

    // output is an array of URLs or ReadableStreams
    const results = output as Array<unknown>;
    if (!results || results.length === 0) {
      throw new Error("No image generated");
    }

    const imageResult = results[0];
    let imageBuffer: Buffer;

    if (imageResult instanceof ReadableStream) {
      // Handle ReadableStream
      const reader = imageResult.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      imageBuffer = Buffer.concat(chunks);
    } else if (typeof imageResult === "string") {
      // Handle URL
      const imgRes = await fetch(imageResult);
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      throw new Error("Unexpected output format from Replicate");
    }

    console.log(`[cover] generated ${imageBuffer.length} bytes`);

    // Save to library if ebookId provided
    if (ebookId) {
      const entry = await getEntry(ebookId);
      if (entry) {
        const coverFilename = "cover.webp";
        await saveFile(ebookId, coverFilename, imageBuffer);
        await updateEntry(ebookId, {
          outputFiles: { ...entry.outputFiles, cover: coverFilename },
        });
        console.log(`[cover] saved to library: ${ebookId}`);
      }
    }

    // Return the image
    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cover] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
