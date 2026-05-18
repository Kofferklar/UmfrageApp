import { SCENARIO_IDS } from "./survey";
import type { ScenarioId, SurveyOrderItem, VariantOrderMap } from "./types";

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

function createMixedQuestionItems(random: () => number): SurveyOrderItem[] {
  const allItems = shuffle(
    SCENARIO_IDS.flatMap((scenarioId) => [
      { scenarioId, variant: "A" as const },
      { scenarioId, variant: "B" as const },
    ]),
    random,
  );

  function arrange(remaining: SurveyOrderItem[], previousScenarioId?: ScenarioId): SurveyOrderItem[] | null {
    if (remaining.length === 0) {
      return [];
    }

    const candidates = shuffle(
      remaining.map((item, index) => ({ item, index })),
      random,
    ).filter(({ item }) => item.scenarioId !== previousScenarioId);

    for (const candidate of candidates) {
      const nextRemaining = remaining.filter((_, index) => index !== candidate.index);
      const rest = arrange(nextRemaining, candidate.item.scenarioId);

      if (rest) {
        return [candidate.item, ...rest];
      }
    }

    return null;
  }

  return arrange(allItems) ?? allItems;
}

export function createSurveyOrder(random: () => number = Math.random): CreatedSurveyOrder {
  const items = createMixedQuestionItems(random);
  const scenarioOrder = [...new Set(items.map((item) => item.scenarioId))];
  const variantOrder: VariantOrderMap = {};

  for (const scenarioId of SCENARIO_IDS) {
    const order = items
      .filter((item) => item.scenarioId === scenarioId)
      .map((item) => item.variant)
      .join("") as "AB" | "BA";
    variantOrder[String(scenarioId)] = order;
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
