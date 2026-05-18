import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { responsesToCsv } from "@/lib/csv";
import { getResponses } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await hasSession("admin"))) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = new URL(request.url);
  const includePretest = url.searchParams.get("includePretest") === "1";
  const responses = await getResponses({ includePretest });
  const csv = responsesToCsv(responses);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gad-survey-export${includePretest ? "-mit-pretest" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
