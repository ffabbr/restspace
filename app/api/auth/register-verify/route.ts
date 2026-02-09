import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getChallenge, deleteChallenge, saveAuthenticator, getDbDebugInfo } from "@/lib/db";
import { createSession, sessionCookie } from "@/lib/session";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`auth:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("challenge_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No challenge session" }, { status: 400 });
    }

    const challengeData = await getChallenge(sessionId);
    if (!challengeData) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
    }

    const rpId = getRpId();
    const origin = getOrigin();

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    if (!challengeData.user_id) {
      return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
    }

    await saveAuthenticator(
      crypto.randomUUID(),
      challengeData.user_id,
      credential.id,
      isoBase64URL.fromBuffer(credential.publicKey),
      credential.counter,
      credential.transports ? JSON.stringify(credential.transports) : null
    );

    await deleteChallenge(sessionId);

    const token = await createSession(challengeData.user_id);
    const res = NextResponse.json({ verified: true });
    const cookie = sessionCookie(token);
    res.cookies.set(cookie.name, cookie.value, cookie);
    res.cookies.delete("challenge_session");

    return res;
  } catch (e) {
    console.error("Register verify error:", getDbDebugInfo(), e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

function getRpId(): string {
  if (process.env.RP_ID) return process.env.RP_ID;
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL.replace(/https?:\/\//, "").split(":")[0];
  return "localhost";
}

function getOrigin(): string {
  if (process.env.ORIGIN) return process.env.ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
