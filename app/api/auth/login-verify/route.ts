import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
  getChallenge,
  deleteChallenge,
  getAuthenticatorByCredentialId,
  updateAuthenticatorCounter,
} from "@/lib/db";
import { getDbDebugInfo } from "@/lib/db";
import { createSession, sessionCookie } from "@/lib/session";
import { cookies } from "next/headers";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

    const credentialId = body.id;
    const authenticator = await getAuthenticatorByCredentialId(credentialId);

    if (!authenticator) {
      return NextResponse.json({ error: "Authenticator not found" }, { status: 400 });
    }

    const rpId = getRpId();
    const origin = getOrigin();

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: authenticator.credential_id,
        publicKey: isoBase64URL.toBuffer(authenticator.credential_public_key),
        counter: Number(authenticator.counter),
        transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    await updateAuthenticatorCounter(
      authenticator.credential_id,
      verification.authenticationInfo.newCounter
    );

    await deleteChallenge(sessionId);

    const token = await createSession(authenticator.user_id);
    const res = NextResponse.json({ verified: true });
    const cookie = sessionCookie(token);
    res.cookies.set(cookie.name, cookie.value, cookie);
    res.cookies.delete("challenge_session");

    return res;
  } catch (e) {
    console.error("Login verify error:", getDbDebugInfo(), e);
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
