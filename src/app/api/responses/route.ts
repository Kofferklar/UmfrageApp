import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { saveResponse } from "@/lib/db";
import { responsePayloadSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasSession("survey"))) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = responsePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Antwort ist unvollständig oder enthält ungültige Werte." },
      { status: 400 },
    );
  }

  try {
    const stored = await saveResponse(parsed.data);
    return NextResponse.json({ ok: true, id: stored.id });
  } catch {
    return NextResponse.json({ error: "Die Antwort konnte nicht gespeichert werden." }, { status: 500 });
  }
}
