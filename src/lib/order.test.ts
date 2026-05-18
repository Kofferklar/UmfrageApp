import { describe, expect, it } from "vitest";
import { createSurveyOrder, validateScenarioOrder, validateVariantOrder } from "./order";

describe("createSurveyOrder", () => {
  it("erzeugt zwanzig gemischte Fragen ohne direkt wiederholtes Szenario", () => {
    const order = createSurveyOrder(() => 0.42);

    expect(validateScenarioOrder(order.scenarioOrder)).toBe(true);
    expect(validateVariantOrder(order.variantOrder)).toBe(true);
    expect(order.items).toHaveLength(20);

    for (const scenarioId of order.scenarioOrder) {
      const variants = order.items.filter((item) => item.scenarioId === scenarioId).map((item) => item.variant).join("");
      expect(variants).toBe(order.variantOrder[String(scenarioId)]);
    }

    for (let index = 1; index < order.items.length; index += 1) {
      expect(order.items[index]?.scenarioId).not.toBe(order.items[index - 1]?.scenarioId);
    }

    const firstAppearanceOrder = [...new Set(order.items.map((item) => item.scenarioId))];
    expect(order.scenarioOrder).toEqual(firstAppearanceOrder);
  });

  it("lehnt doppelte oder unvollstaendige Szenarioreihenfolgen ab", () => {
    expect(validateScenarioOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(true);
    expect(validateScenarioOrder([1, 1, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(false);
    expect(validateScenarioOrder([1, 2, 3])).toBe(false);
  });
});
