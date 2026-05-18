import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type AuthScope = "survey" | "admin";

const COOKIE_NAMES: Record<AuthScope, string> = {
  survey: "gad_survey_session",
  admin: "gad_admin_session",
};

const MAX_AGE_SECONDS: Record<AuthScope, number> = {
  survey: 60 * 60 * 8,
  admin: 60 * 60 * 4,
};

function getConfiguredPassword(scope: AuthScope): string | null {
  const value = scope === "survey" ? process.env.SURVEY_PASSWORD : process.env.ADMIN_PASSWORD;
  return value && value.length > 0 ? value : null;
}

function getSigningSecret(): string | null {
  const surveyPassword = getConfiguredPassword("survey");
  const adminPassword = getConfiguredPassword("admin");

  if (!surveyPassword || !adminPassword) {
    return null;
  }

  return `${surveyPassword}.${adminPassword}`;
}

function sign(value: string): string | null {
  const secret = getSigningSecret();

  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", "gad-password-check").update(left).digest();
  const rightDigest = createHmac("sha256", "gad-password-check").update(right).digest();

  return timingSafeEqual(leftDigest, rightDigest);
}

export function verifyPassword(scope: AuthScope, candidate: string): boolean {
  const configured = getConfiguredPassword(scope);

  if (!configured) {
    return false;
  }

  return safeEqual(candidate, configured);
}

export function createSessionToken(scope: AuthScope): string | null {
  const issuedAt = Date.now();
  const payload = `${scope}.${issuedAt}`;
  const signature = sign(payload);

  return signature ? `${payload}.${signature}` : null;
}

export function verifySessionToken(scope: AuthScope, token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [tokenScope, issuedAtRaw, signature] = token.split(".");

  if (tokenScope !== scope || !issuedAtRaw || !signature) {
    return false;
  }

  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > MAX_AGE_SECONDS[scope] * 1000) {
    return false;
  }

  const expected = sign(`${tokenScope}.${issuedAtRaw}`);

  if (!expected) {
    return false;
  }

  return safeEqual(signature, expected);
}

export async function hasSession(scope: AuthScope): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES[scope])?.value;

  return verifySessionToken(scope, token);
}

export function setSessionCookie(response: NextResponse, scope: AuthScope, token: string): void {
  response.cookies.set(COOKIE_NAMES[scope], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS[scope],
  });
}
