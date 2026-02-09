import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { saveChallenge, getDbDebugInfo } from "@/lib/db";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`auth:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: "preferred",
    });

    let sessionId = (await cookies()).get("challenge_session")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
    await saveChallenge(sessionId, options.challenge);

    const res = NextResponse.json(options);
    res.cookies.set("challenge_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    });

    return res;
  } catch (e) {
    console.error("Login options error:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Failed to generate options" }, { status: 500 });
  }
}

function getRpId(): string {
  if (process.env.RP_ID) return process.env.RP_ID;
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL.replace(/https?:\/\//, "").split(":")[0];
  return "localhost";
}
