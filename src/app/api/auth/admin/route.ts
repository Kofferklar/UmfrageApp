import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte geben Sie ein Passwort ein." }, { status: 400 });
  }

  if (!verifyPassword("admin", parsed.data.password)) {
    return NextResponse.json({ error: "Das Passwort ist nicht korrekt." }, { status: 401 });
  }

  const token = createSessionToken("admin");

  if (!token) {
    return NextResponse.json({ error: "Der Admin-Zugang ist nicht konfiguriert." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, "admin", token);
  return response;
}
