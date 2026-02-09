import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { saveChallenge, createUser, getAuthenticatorsByUserId, getDbDebugInfo } from "@/lib/db";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`auth:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const userId = crypto.randomUUID();
    await createUser(userId);

    const existingAuths = await getAuthenticatorsByUserId(userId);

    const options = await generateRegistrationOptions({
      rpName: "restspace",
      rpID: getRpId(),
      userName: `anon-${userId.slice(0, 8)}`,
      attestationType: "none",
      excludeCredentials: existingAuths.map((a) => ({
        id: a.credential_id,
        transports: a.transports ? JSON.parse(a.transports) : undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge with a session identifier
    let sessionId = (await cookies()).get("challenge_session")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
    await saveChallenge(sessionId, options.challenge, userId);

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
    console.error("Register options error:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Failed to generate options" }, { status: 500 });
  }
}

function getRpId(): string {
  if (process.env.RP_ID) return process.env.RP_ID;
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL.replace(/https?:\/\//, "").split(":")[0];
  return "localhost";
}
