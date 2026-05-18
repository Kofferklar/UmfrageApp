import { getAnswerField } from "./survey";
import { RISK_GROUPS, SCENARIOS } from "./survey";
import type { NullableStats, RiskLevel, ScenarioId, StoredSurveyResponse, Variant } from "./types";

export type ScenarioAnalysisRow = {
  scenarioId: ScenarioId;
  title: string;
  risk: RiskLevel;
  variantA: NullableStats;
  variantB: NullableStats;
  combined: NullableStats;
  difference: number | null;
  outliers: number[];
};

export type AnalysisResult = {
  responseCount: number;
  scenarioRows: ScenarioAnalysisRow[];
  overall: {
    variantA: NullableStats;
    variantB: NullableStats;
    combined: NullableStats;
  };
  riskGroups: Record<
    RiskLevel,
    {
      variantA: NullableStats;
      variantB: NullableStats;
      combined: NullableStats;
    }
  >;
  sample: {
    age_group: Record<string, number>;
    gender: Record<string, number>;
    ai_experience: Record<string, number>;
  };
  averageDurationMinutes: number | null;
};

const EMPTY_STATS: NullableStats = {
  count: 0,
  mean: null,
  median: null,
  standardDeviation: null,
  min: null,
  max: null,
  q1: null,
  q3: null,
  iqr: null,
};

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function median(sortedValues: number[]): number | null {
  if (sortedValues.length === 0) {
    return null;
  }

  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middle] ?? null;
  }

  return ((sortedValues[middle - 1] ?? 0) + (sortedValues[middle] ?? 0)) / 2;
}

export function calculateStats(values: number[]): NullableStats {
  if (values.length === 0) {
    return { ...EMPTY_STATS };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mean = sum / count;
  const center = median(sorted);
  const lowerHalf = sorted.slice(0, Math.floor(count / 2));
  const upperHalf = sorted.slice(Math.ceil(count / 2));
  const q1 = median(lowerHalf) ?? sorted[0] ?? null;
  const q3 = median(upperHalf) ?? sorted[count - 1] ?? null;
  const iqr = q1 === null || q3 === null ? null : q3 - q1;
  const variance =
    count > 1
      ? sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / (count - 1)
      : 0;

  return {
    count,
    mean: round(mean),
    median: center,
    standardDeviation: round(Math.sqrt(variance)),
    min: sorted[0] ?? null,
    max: sorted[count - 1] ?? null,
    q1,
    q3,
    iqr,
  };
}

export function detectOutliers(values: number[]): number[] {
  const stats = calculateStats(values);

  if (stats.median === null || stats.iqr === null) {
    return [];
  }

  const lower = stats.median - 1.5 * stats.iqr;
  const upper = stats.median + 1.5 * stats.iqr;

  return values.filter((value) => value < lower || value > upper);
}

function valuesForVariant(responses: StoredSurveyResponse[], scenarioIds: readonly ScenarioId[], variant: Variant) {
  return responses.flatMap((response) =>
    scenarioIds.map((scenarioId) => response[getAnswerField(scenarioId, variant)]),
  );
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

export function analyzeResponses(
  responses: StoredSurveyResponse[],
  options: { includePretest?: boolean } = {},
): AnalysisResult {
  const included = options.includePretest ? responses : responses.filter((response) => !response.is_pretest);
  const scenarioRows = SCENARIOS.map((scenario) => {
    const scenarioIds = [scenario.id] as const;
    const variantAValues = valuesForVariant(included, scenarioIds, "A");
    const variantBValues = valuesForVariant(included, scenarioIds, "B");
    const combinedValues = [...variantAValues, ...variantBValues];
    const variantA = calculateStats(variantAValues);
    const variantB = calculateStats(variantBValues);

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      risk: scenario.risk,
      variantA,
      variantB,
      combined: calculateStats(combinedValues),
      difference: variantA.mean === null || variantB.mean === null ? null : round(variantA.mean - variantB.mean),
      outliers: detectOutliers(combinedValues),
    };
  });

  const allScenarioIds = SCENARIOS.map((scenario) => scenario.id);
  const overallA = valuesForVariant(included, allScenarioIds, "A");
  const overallB = valuesForVariant(included, allScenarioIds, "B");
  const durations = included
    .map((response) => response.duration_seconds)
    .filter((duration) => Number.isFinite(duration) && duration >= 0);

  const sample = {
    age_group: {} as Record<string, number>,
    gender: {} as Record<string, number>,
    ai_experience: {} as Record<string, number>,
  };

  for (const response of included) {
    increment(sample.age_group, response.age_group);
    increment(sample.gender, response.gender);
    increment(sample.ai_experience, response.ai_experience === null ? "no_answer" : String(response.ai_experience));
  }

  const riskGroups = Object.fromEntries(
    Object.entries(RISK_GROUPS).map(([risk, scenarioIds]) => {
      const variantA = valuesForVariant(included, scenarioIds, "A");
      const variantB = valuesForVariant(included, scenarioIds, "B");

      return [
        risk,
        {
          variantA: calculateStats(variantA),
          variantB: calculateStats(variantB),
          combined: calculateStats([...variantA, ...variantB]),
        },
      ];
    }),
  ) as AnalysisResult["riskGroups"];

  return {
    responseCount: included.length,
    scenarioRows,
    overall: {
      variantA: calculateStats(overallA),
      variantB: calculateStats(overallB),
      combined: calculateStats([...overallA, ...overallB]),
    },
    riskGroups,
    sample,
    averageDurationMinutes:
      durations.length === 0
        ? null
        : round(durations.reduce((total, duration) => total + duration, 0) / durations.length / 60, 2),
  };
}
