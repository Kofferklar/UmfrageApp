import { describe, expect, it } from "vitest";
import { analyzeResponses, calculateStats, detectOutliers } from "./analysis";
import type { StoredSurveyResponse } from "./types";

function makeResponse(overrides: Partial<StoredSurveyResponse> = {}): StoredSurveyResponse {
  const baseAnswers = Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => {
      const id = index + 1;
      return [
        [`scenario_${id}_a`, 4],
        [`scenario_${id}_b`, 2],
      ];
    }).flat(),
  );

  return {
    id: "response-test",
    age_group: "25_39",
    gender: "no_answer",
    ai_experience: 3,
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
    submitted_at: "2026-05-18T10:05:00.000Z",
    duration_seconds: 300,
    app_version: "1.0",
    is_pretest: false,
    ...baseAnswers,
    ...overrides,
  } as StoredSurveyResponse;
}

describe("calculateStats", () => {
  it("berechnet Mittelwert, Median, Stichproben-Standardabweichung und IQR", () => {
    const stats = calculateStats([1, 2, 3, 4, 5]);

    expect(stats).toMatchObject({
      count: 5,
      mean: 3,
      median: 3,
      min: 1,
      max: 5,
      q1: 1.5,
      q3: 4.5,
      iqr: 3,
    });
    expect(stats.standardDeviation).toBeCloseTo(1.5811, 4);
  });

  it("gibt null-Werte fuer leere Datenreihen zurueck", () => {
    expect(calculateStats([])).toEqual({
      count: 0,
      mean: null,
      median: null,
      standardDeviation: null,
      min: null,
      max: null,
      q1: null,
      q3: null,
      iqr: null,
    });
  });
});

describe("detectOutliers", () => {
  it("markiert Werte ausserhalb von Median plus/minus 1.5 IQR", () => {
    expect(detectOutliers([2, 2, 2, 2, 2, 2, 5])).toEqual([5]);
  });
});

describe("analyzeResponses", () => {
  it("berechnet Szenario-, Varianten- und Risikogruppenwerte ohne Pretests", () => {
    const analysis = analyzeResponses([
      makeResponse(),
      makeResponse({
        id: "response-pretest",
        is_pretest: true,
        scenario_1_a: 1,
        scenario_1_b: 1,
      }),
    ]);

    expect(analysis.responseCount).toBe(1);
    expect(analysis.scenarioRows).toHaveLength(10);
    expect(analysis.scenarioRows[0]).toMatchObject({
      scenarioId: 1,
      difference: 2,
      outliers: [],
    });
    expect(analysis.overall.variantA.mean).toBe(4);
    expect(analysis.overall.variantB.mean).toBe(2);
    expect(analysis.riskGroups.low.combined.mean).toBe(3);
    expect(analysis.sample.age_group["25_39"]).toBe(1);
    expect(analysis.averageDurationMinutes).toBe(5);
  });
});
