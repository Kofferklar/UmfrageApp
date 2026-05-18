import { ANSWER_FIELDS } from "./survey";
import type { StoredSurveyResponse } from "./types";

const CSV_HEADERS = [
  ...ANSWER_FIELDS,
  "age_group",
  "gender",
  "ai_experience",
  "scenario_order",
  "variant_order",
  "started_at",
  "submitted_at",
  "duration_seconds",
  "app_version",
  "is_pretest",
] as const;

function escapeCsv(value: unknown): string {
  const serialized =
    value === null || value === undefined
      ? ""
      : Array.isArray(value) || typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return `"${serialized.replaceAll('"', '""')}"`;
}

export function responsesToCsv(responses: StoredSurveyResponse[]): string {
  const rows = responses.map((response) =>
    CSV_HEADERS.map((header) => escapeCsv(response[header as keyof StoredSurveyResponse])).join(","),
  );

  return [CSV_HEADERS.join(","), ...rows].join("\n");
}
