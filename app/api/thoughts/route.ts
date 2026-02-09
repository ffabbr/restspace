import { NextResponse } from "next/server";
import { getThoughts, createThought, getDbDebugInfo } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`thoughts-get:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const thoughts = await getThoughts();
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

    const { content, font, category } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      return NextResponse.json({ error: "Content must be 1-2000 characters" }, { status: 400 });
    }

    const validFonts = ["sans-serif", "serif", "mono"];
    const safeFont = validFonts.includes(font) ? font : "sans-serif";

    const validCategories = ["thought", "diary", "aspiration"];
    const safeCategory = validCategories.includes(category) ? category : "thought";

    const thought = await createThought(trimmed, safeFont, safeCategory);
    return NextResponse.json(thought);
  } catch (e) {
    console.error("Failed to create thought:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
