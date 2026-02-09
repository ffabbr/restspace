import { NextResponse } from "next/server";
import { getThoughtsLatest, getThoughtsBefore, createThought, updateThought, getDbDebugInfo } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { containsHateSpeech } from "@/lib/moderation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`thoughts-get:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const before = searchParams.get("before");
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

    const thoughts = before
      ? await getThoughtsBefore(Number(before), limit)
      : await getThoughtsLatest(limit);

    return NextResponse.json(thoughts);
  } catch (e) {
    console.error("Failed to fetch thoughts:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`thoughts-post:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { content, font, category, color } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return NextResponse.json({ error: "Content must be 1-2000 characters" }, { status: 400 });
    }

    if (containsHateSpeech(trimmed)) {
      return NextResponse.json({ error: "Content contains language that isn't allowed on this platform" }, { status: 400 });
    }

    const validFonts = ["sans-serif", "serif", "mono"];
    const safeFont = validFonts.includes(font) ? font : "sans-serif";

    const validCategories = ["thought", "diary", "aspiration"];
    const safeCategory = validCategories.includes(category) ? category : "thought";

    const validColors = ["default", "rose", "blue"];
    const safeColor = validColors.includes(color) ? color : "default";

    const thought = await createThought(trimmed, safeFont, safeCategory, safeColor, session.userId);
    return NextResponse.json(thought);
  } catch (e) {
    console.error("Failed to create thought:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`thoughts-put:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id, content } = await req.json();
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return NextResponse.json({ error: "Content must be 1-2000 characters" }, { status: 400 });
    }

    if (containsHateSpeech(trimmed)) {
      return NextResponse.json({ error: "Content contains language that isn't allowed on this platform" }, { status: 400 });
    }

    const thought = await updateThought(id, trimmed, session.userId);
    if (!thought) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 403 });
    }
    return NextResponse.json(thought);
  } catch (e) {
    console.error("Failed to update thought:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
