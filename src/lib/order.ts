import { SCENARIO_IDS } from "./survey";
import type { ScenarioId, SurveyOrderItem, Variant, VariantOrderMap } from "./types";

export type CreatedSurveyOrder = {
  scenarioOrder: ScenarioId[];
  variantOrder: VariantOrderMap;
  items: SurveyOrderItem[];
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createSurveyOrder(random: () => number = Math.random): CreatedSurveyOrder {
  const scenarioOrder = shuffle(SCENARIO_IDS, random);
  const variantOrder: VariantOrderMap = {};
  const items: SurveyOrderItem[] = [];

  for (const scenarioId of scenarioOrder) {
    const order = random() < 0.5 ? "AB" : "BA";
    variantOrder[String(scenarioId)] = order;

    for (const variant of order.split("") as Variant[]) {
      items.push({ scenarioId, variant });
    }
  }

  return { scenarioOrder, variantOrder, items };
}

export function validateScenarioOrder(value: unknown): value is ScenarioId[] {
  if (!Array.isArray(value) || value.length !== SCENARIO_IDS.length) {
    return false;
  }

  const allowed = new Set<number>(SCENARIO_IDS);
  const unique = new Set<number>();

  for (const item of value) {
    if (!Number.isInteger(item) || !allowed.has(item)) {
      return false;
    }

    unique.add(item);
  }

  return unique.size === SCENARIO_IDS.length;
}

export function validateVariantOrder(value: unknown): value is VariantOrderMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const allowedKeys = new Set(SCENARIO_IDS.map(String));

  if (entries.length !== SCENARIO_IDS.length) {
    return false;
  }

  return entries.every(([key, order]) => allowedKeys.has(key) && (order === "AB" || order === "BA"));
}
