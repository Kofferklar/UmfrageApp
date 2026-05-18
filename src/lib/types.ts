export type ScenarioId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Variant = "A" | "B";

export type VariantOrderValue = "AB" | "BA";

export type RiskLevel = "low" | "medium" | "high";

export type AgeGroup = "under_25" | "25_39" | "40_59" | "60_plus" | "no_answer";

export type Gender = "female" | "male" | "diverse" | "no_answer";

export type AnswerField = `scenario_${ScenarioId}_${"a" | "b"}`;

export type SurveyAnswers = Record<AnswerField, number>;

export type VariantOrderMap = Record<string, VariantOrderValue>;

export type ScenarioOrder = ScenarioId[];

export type SurveyOrderItem = {
  scenarioId: ScenarioId;
  variant: Variant;
};

export type ResponsePayload = SurveyAnswers & {
  notice_confirmed: true;
  age_group: AgeGroup;
  gender: Gender;
  ai_experience: number | null;
  scenario_order: ScenarioOrder;
  variant_order: VariantOrderMap;
  started_at: string;
  is_pretest: boolean;
};

export type StoredSurveyResponse = SurveyAnswers & {
  id: string;
  age_group: AgeGroup;
  gender: Gender;
  ai_experience: number | null;
  scenario_order: ScenarioOrder;
  variant_order: VariantOrderMap;
  started_at: string;
  submitted_at: string;
  duration_seconds: number;
  app_version: string;
  is_pretest: boolean;
};

export type NullableStats = {
  count: number;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
};
