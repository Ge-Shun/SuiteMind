import { z } from "zod";

export const transformOperationSchema = z.enum([
  "polish",
  "rewrite",
  "translate",
  "summarize",
  "continue",
  "custom",
]);

export type TransformOperation = z.infer<typeof transformOperationSchema>;

export const transformRequestSchema = z
  .object({
    operation: transformOperationSchema,
    text: z.string().min(1, "Select some text first.").max(10_000),
    instruction: z.string().trim().max(1_000).optional().default(""),
    targetLanguage: z.string().trim().min(1).max(80).nullable().optional(),
    documentLanguage: z.string().trim().min(2).max(35).optional(),
  })
  .superRefine((value, context) => {
    if (value.operation === "translate" && !value.targetLanguage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetLanguage"],
        message: "Choose a target language.",
      });
    }

    if (value.operation === "custom" && !value.instruction) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["instruction"],
        message: "Enter a custom instruction.",
      });
    }
  });

export type TransformRequest = z.infer<typeof transformRequestSchema>;

export const transformUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
});

export type TransformUsage = z.infer<typeof transformUsageSchema>;

export const deltaEventSchema = z.object({
  type: z.literal("delta"),
  text: z.string(),
});

export const doneEventSchema = z.object({
  type: z.literal("done"),
  requestId: z.string().min(1),
  model: z.string().optional(),
  usage: transformUsageSchema.optional(),
});

export const errorEventSchema = z.object({
  type: z.literal("error"),
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().default(false),
});

export const transformStreamEventSchema = z.discriminatedUnion("type", [
  deltaEventSchema,
  doneEventSchema,
  errorEventSchema,
]);

export type TransformStreamEvent = z.infer<typeof transformStreamEventSchema>;

export function encodeSseEvent(event: TransformStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
