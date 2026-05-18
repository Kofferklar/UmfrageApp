import { describe, expect, it } from "vitest";
import { createSurveyOrder, validateScenarioOrder, validateVariantOrder } from "./order";

describe("createSurveyOrder", () => {
  it("erzeugt zehn Szenarien, je zwei direkt aufeinanderfolgende Varianten und gueltige Reihenfolgefelder", () => {
    const order = createSurveyOrder(() => 0.42);

    expect(validateScenarioOrder(order.scenarioOrder)).toBe(true);
    expect(validateVariantOrder(order.variantOrder)).toBe(true);
    expect(order.items).toHaveLength(20);

    for (let index = 0; index < order.items.length; index += 2) {
      expect(order.items[index]?.scenarioId).toBe(order.items[index + 1]?.scenarioId);
      const scenarioId = order.items[index]?.scenarioId;
      const variants = [order.items[index]?.variant, order.items[index + 1]?.variant].join("");
      expect(variants).toBe(order.variantOrder[String(scenarioId)]);
    }
  });

  it("lehnt doppelte oder unvollstaendige Szenarioreihenfolgen ab", () => {
    expect(validateScenarioOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(true);
    expect(validateScenarioOrder([1, 1, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(false);
    expect(validateScenarioOrder([1, 2, 3])).toBe(false);
  });
});
