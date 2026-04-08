import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

// Verify payment and return download token
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const bookId = request.nextUrl.searchParams.get("book_id");

  if (!sessionId || !bookId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!STRIPE_SECRET) {
    return NextResponse.json(
      { error: "Stripe nicht konfiguriert" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(STRIPE_SECRET);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.payment_status !== "paid" ||
      session.metadata?.bookId !== bookId
    ) {
      return NextResponse.json(
        { error: "Zahlung nicht bestätigt" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      paid: true,
      bookId,
      customerEmail: session.customer_details?.email || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
