import { z } from "zod";
import { validateScenarioOrder, validateVariantOrder } from "./order";
import { ANSWER_FIELDS } from "./survey";
import type { AnswerField, ScenarioOrder, VariantOrderMap } from "./types";

const answerShape = Object.fromEntries(
  ANSWER_FIELDS.map((field) => [field, z.number().int().min(1).max(5)]),
) as Record<AnswerField, z.ZodNumber>;

export const passwordSchema = z.object({
  password: z.string().min(1).max(200),
});

export const responsePayloadSchema = z.object({
  notice_confirmed: z.literal(true),
  age_group: z.enum(["under_25", "25_39", "40_59", "60_plus", "no_answer"]).default("no_answer"),
  gender: z.enum(["female", "male", "diverse", "no_answer"]).default("no_answer"),
  ai_experience: z.number().int().min(1).max(5).nullable(),
  scenario_order: z.custom<ScenarioOrder>(validateScenarioOrder, {
    message: "scenario_order muss alle zehn Szenario-IDs genau einmal enthalten.",
  }),
  variant_order: z.custom<VariantOrderMap>(validateVariantOrder, {
    message: "variant_order muss fuer jedes Szenario AB oder BA enthalten.",
  }),
  started_at: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "started_at muss ein gueltiger ISO-Zeitstempel sein.",
  }),
  is_pretest: z.boolean().default(false),
  ...answerShape,
});

export type ValidResponsePayload = z.infer<typeof responsePayloadSchema>;
