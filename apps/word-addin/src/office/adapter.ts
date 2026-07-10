import type { ApplyMode, SelectionSnapshot } from "../types";

export class EmptySelectionError extends Error {
  constructor() {
    super("Select text or place the cursor in a non-empty Word paragraph.");
    this.name = "EmptySelectionError";
  }
}

export class StaleSelectionError extends Error {
  constructor() {
    super("The Word selection changed. Select the original text and try again.");
    this.name = "StaleSelectionError";
  }
}

export interface OfficeAdapter {
  readonly mode: "word" | "mock";
  readSelection(): Promise<SelectionSnapshot>;
  apply(snapshot: SelectionSnapshot, result: string, mode: ApplyMode): Promise<void>;
  release(snapshot: SelectionSnapshot): Promise<void>;
}

export class SelectionExpiredError extends Error {
  constructor() {
    super("The saved Word selection is no longer available. Select the text again.");
    this.name = "SelectionExpiredError";
  }
}

export async function fingerprintText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createSnapshotId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
