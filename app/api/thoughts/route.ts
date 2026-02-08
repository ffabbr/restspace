import { NextResponse } from "next/server";
import { getThoughts, createThought } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const thoughts = await getThoughts();
    return NextResponse.json(thoughts);
  } catch (e) {
    console.error("Failed to fetch thoughts:", e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    console.error("Failed to create thought:", e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
