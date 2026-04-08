import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getEntry } from "../../library/store";

export const dynamic = "force-dynamic";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const PRICE_EUR = 999; // €9.99 in cents
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "ebookgenerator.puls.io";

export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET) {
    return NextResponse.json(
      { error: "Stripe nicht konfiguriert" },
      { status: 500 }
    );
  }

  const { bookId } = (await request.json()) as { bookId: string };
  if (!bookId) {
    return NextResponse.json(
      { error: "bookId fehlt" },
      { status: 400 }
    );
  }

  const book = await getEntry(bookId);
  if (!book || book.status !== "done" || !book.outputFiles?.pdf) {
    return NextResponse.json(
      { error: "Ebook nicht gefunden" },
      { status: 404 }
    );
  }

  const stripe = new Stripe(STRIPE_SECRET);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: book.title,
              description: book.subtitle || `${book.chapters?.length || 0} Kapitel · ${book.wordCount?.toLocaleString("de-DE") || "?"} Wörter · PDF`,
              ...(book.outputFiles?.cover
                ? {
                    images: [
                      `https://${DOMAIN}/api/library/download?id=${book.id}&format=cover`,
                    ],
                  }
                : {}),
            },
            unit_amount: PRICE_EUR,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://${DOMAIN}/shop/success?session_id={CHECKOUT_SESSION_ID}&book_id=${book.id}`,
      cancel_url: `https://${DOMAIN}/shop`,
      metadata: {
        bookId: book.id,
        bookTitle: book.title,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    console.error("[shop/checkout] Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
