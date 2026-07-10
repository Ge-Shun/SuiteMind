import type { TransformRequest } from "@suitemind/contracts";

const operationInstructions: Record<TransformRequest["operation"], string> = {
  polish:
    "Improve clarity, grammar, tone, and flow while preserving the meaning and level of detail.",
  rewrite:
    "Rewrite the text with fresh wording while preserving its meaning and important details.",
  translate:
    "Translate accurately and naturally. Preserve paragraph breaks, names, numbers, and domain terminology.",
  summarize:
    "Summarize the text concisely. Preserve the central claims, decisions, and important qualifications.",
  continue:
    "Continue the text naturally in the same language, tone, viewpoint, and formatting style.",
  custom: "Follow the user's editing instruction precisely.",
};

export interface PromptMessage {
  role: "system" | "user";
  content: string;
}

export function buildPrompt(request: TransformRequest): PromptMessage[] {
  const systemParts = [
    "You are SuiteMind, an editing assistant embedded in Microsoft Word.",
    operationInstructions[request.operation],
    "Return only the transformed document text. Do not add commentary, labels, quotation marks, or markdown fences unless the user explicitly requests them.",
  ];

  if (request.documentLanguage) {
    systemParts.push(`The document language is ${request.documentLanguage}.`);
  }

  if (request.operation === "translate" && request.targetLanguage) {
    systemParts.push(`Translate into ${request.targetLanguage}.`);
  }

  const userParts = [];

  if (request.instruction) {
    userParts.push(`Instruction:\n${request.instruction}`);
  }

  userParts.push(`Document text:\n${request.text}`);

  return [
    { role: "system", content: systemParts.join(" ") },
    { role: "user", content: userParts.join("\n\n") },
  ];
}
