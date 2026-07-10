import type { TransformOperation } from "@suitemind/contracts";

export type AppPhase =
  "ready" | "reading" | "generating" | "review" | "applying" | "success" | "error";

export type ApplyMode = "replace" | "insert";

export interface SelectionSnapshot {
  id: string;
  source: "selection" | "paragraph";
  text: string;
  fingerprint: string;
  documentLanguage?: string;
}

export interface ActionDefinition {
  operation: TransformOperation;
  label: string;
  description: string;
}
