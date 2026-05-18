import type { AnswerField, RiskLevel, ScenarioId, Variant } from "./types";

export const APP_VERSION = "1.0";

export const TRUST_QUESTION = "Wie sehr würden Sie der KI in dieser Situation vertrauen?";

export const SCALE_OPTIONS = [
  { value: 1, label: "vertraue gar nicht" },
  { value: 2, label: "vertraue eher nicht" },
  { value: 3, label: "teils/teils" },
  { value: 4, label: "vertraue eher" },
  { value: 5, label: "vertraue voll und ganz" },
] as const;

export const VARIANT_TEXT: Record<Variant, { title: string; body: string }> = {
  A: {
    title: "Variante A: KI empfiehlt",
    body: "Die KI gibt eine Empfehlung ab, aber ein Mensch trifft die endgültige Entscheidung.",
  },
  B: {
    title: "Variante B: KI entscheidet autonom",
    body: "Die KI trifft die Entscheidung vollständig autonom, ohne menschliches Eingreifen.",
  },
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "niedrig",
  medium: "mittel",
  high: "hoch",
};

export const RISK_GROUP_LABELS: Record<RiskLevel, string> = {
  low: "Niedriges Risiko",
  medium: "Mittleres Risiko",
  high: "Hohes Risiko",
};

export const RISK_GROUPS: Record<RiskLevel, readonly ScenarioId[]> = {
  low: [1, 2, 4],
  medium: [3, 5, 6],
  high: [7, 8, 9, 10],
};

export type Scenario = {
  id: ScenarioId;
  title: string;
  text: string;
  risk: RiskLevel;
};

export const SCENARIOS = [
  {
    id: 1,
    title: "Terminpriorisierung in einer Arztpraxis",
    text: "Eine Arztpraxis hat viele Terminanfragen. Es muss entschieden werden, welche Personen schneller einen Termin bekommen und welche warten können.",
    risk: "low",
  },
  {
    id: 2,
    title: "Empfehlung für eine Vorsorgeuntersuchung",
    text: "Auf Grundlage von Alter, Beschwerden und bisherigen Gesundheitsdaten wird eingeschätzt, ob eine zusätzliche Vorsorgeuntersuchung sinnvoll ist.",
    risk: "low",
  },
  {
    id: 3,
    title: "Einschätzung einer Hautveränderung",
    text: "Ein auffälliger Hautfleck wird anhand eines Fotos eingeschätzt. Es geht darum, ob die Stelle eher harmlos wirkt oder ärztlich abgeklärt werden sollte.",
    risk: "medium",
  },
  {
    id: 4,
    title: "Auswahl eines Medikaments bei leichten Beschwerden",
    text: "Eine Person hat leichte Beschwerden, zum Beispiel Kopfschmerzen oder Halsschmerzen. Es wird ein passendes nicht verschreibungspflichtiges Medikament ausgewählt.",
    risk: "low",
  },
  {
    id: 5,
    title: "Entscheidung über Antibiotika",
    text: "Eine Person hat Beschwerden, bei denen eine bakterielle Infektion möglich ist. Es wird eingeschätzt, ob Antibiotika verschrieben werden sollten.",
    risk: "medium",
  },
  {
    id: 6,
    title: "Einschätzung eines Röntgenbildes",
    text: "Ein Röntgenbild wird auf Hinweise für eine Erkrankung geprüft. Es geht darum, ob weitere Untersuchungen nötig sind.",
    risk: "medium",
  },
  {
    id: 7,
    title: "Einschätzung in der Notaufnahme",
    text: "In einer Notaufnahme kommen mehrere Personen gleichzeitig an. Es muss entschieden werden, wer sofort behandelt wird und wer warten kann.",
    risk: "high",
  },
  {
    id: 8,
    title: "Entscheidung über die Dringlichkeit einer Operation",
    text: "Bei einer Person steht eine Operation an. Es muss entschieden werden, ob sie sofort oder erst später durchgeführt wird.",
    risk: "high",
  },
  {
    id: 9,
    title: "Fortsetzen oder Abbrechen einer Behandlung",
    text: "Bei einer schweren Erkrankung wird eingeschätzt, ob eine belastende Behandlung weitergeführt oder beendet werden sollte.",
    risk: "high",
  },
  {
    id: 10,
    title: "Zuteilung eines Intensivbetts",
    text: "In einem Krankenhaus sind nur wenige Intensivbetten frei. Es muss entschieden werden, welche Person zuerst ein Bett bekommt.",
    risk: "high",
  },
] as const satisfies readonly Scenario[];

export const SCENARIO_IDS = SCENARIOS.map((scenario) => scenario.id) as ScenarioId[];

export const ANSWER_FIELDS = SCENARIOS.flatMap((scenario) => [
  `scenario_${scenario.id}_a`,
  `scenario_${scenario.id}_b`,
]) as AnswerField[];

export function getScenario(scenarioId: ScenarioId): Scenario {
  const scenario = SCENARIOS.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error(`Unknown scenario id ${scenarioId}`);
  }

  return scenario;
}

export function getAnswerField(scenarioId: ScenarioId, variant: Variant): AnswerField {
  return `scenario_${scenarioId}_${variant.toLowerCase() as "a" | "b"}`;
}
