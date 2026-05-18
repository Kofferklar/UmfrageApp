import { describe, expect, it } from "vitest";
import { responsePayloadSchema } from "./validation";

const validAnswers = Object.fromEntries(
  Array.from({ length: 10 }, (_, index) => {
    const id = index + 1;
    return [
      [`scenario_${id}_a`, 4],
      [`scenario_${id}_b`, 2],
    ];
  }).flat(),
);

const validPayload = {
  notice_confirmed: true,
  age_group: "no_answer",
  gender: "no_answer",
  ai_experience: null,
  scenario_order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  variant_order: {
    "1": "AB",
    "2": "BA",
    "3": "AB",
    "4": "BA",
    "5": "AB",
    "6": "BA",
    "7": "AB",
    "8": "BA",
    "9": "AB",
    "10": "BA",
  },
  started_at: "2026-05-18T10:00:00.000Z",
  is_pretest: false,
  ...validAnswers,
};

describe("responsePayloadSchema", () => {
  it("akzeptiert eine vollstaendige anonyme Antwort", () => {
    expect(responsePayloadSchema.parse(validPayload).scenario_1_a).toBe(4);
  });

  it("lehnt fehlende Antworten ab", () => {
    const payload = { ...validPayload };
    delete (payload as Record<string, unknown>).scenario_10_b;

    expect(responsePayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("lehnt doppelte Szenario-IDs und unvollstaendige Variantenordnung ab", () => {
    expect(
      responsePayloadSchema.safeParse({
        ...validPayload,
        scenario_order: [1, 1, 3, 4, 5, 6, 7, 8, 9, 10],
      }).success,
    ).toBe(false);

    expect(
      responsePayloadSchema.safeParse({
        ...validPayload,
        variant_order: { ...validPayload.variant_order, "10": "AA" },
      }).success,
    ).toBe(false);
  });
});
