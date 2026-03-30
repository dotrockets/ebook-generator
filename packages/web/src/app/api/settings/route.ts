import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "./store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await loadSettings();
  return NextResponse.json(settings);
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_FONT = /^[a-zA-Z0-9\s]+$/;
const COLOR_KEYS = ["bgPrimary", "bgSecondary", "bgTertiary", "textPrimary", "textSecondary", "accent"];
const FONT_KEYS = ["headingFont", "bodyFont"];

export async function PUT(request: NextRequest) {
  const body = await request.json();

  for (const key of COLOR_KEYS) {
    if (body[key] && !HEX_COLOR.test(body[key])) {
      return NextResponse.json({ error: `Invalid color for ${key}` }, { status: 400 });
    }
  }
  for (const key of FONT_KEYS) {
    if (body[key] && (!SAFE_FONT.test(body[key]) || body[key].length > 50)) {
      return NextResponse.json({ error: `Invalid font name for ${key}` }, { status: 400 });
    }
  }

  const settings = await saveSettings(body);
  return NextResponse.json(settings);
}
