import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "./store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await loadSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const settings = await saveSettings(body);
  return NextResponse.json(settings);
}
