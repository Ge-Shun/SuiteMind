import type { ApplyMode, SelectionSnapshot } from "../types";
import {
  createSnapshotId,
  EmptySelectionError,
  fingerprintText,
  type OfficeAdapter,
  StaleSelectionError,
  SelectionExpiredError,
} from "./adapter";

const DEFAULT_SELECTION =
  "SuiteMind helps people improve documents without leaving Microsoft Word.  It keeps every change reviewable before it is applied .";

export class MockOfficeAdapter implements OfficeAdapter {
  readonly mode = "mock" as const;
  private selection = DEFAULT_SELECTION;
  private insertedText = "";
  private activeSnapshotId: string | null = null;

  async readSelection(): Promise<SelectionSnapshot> {
    if (!this.selection.trim()) {
      throw new EmptySelectionError();
    }

    const id = createSnapshotId();
    this.activeSnapshotId = id;

    return {
      id,
      source: "selection",
      text: this.selection,
      fingerprint: await fingerprintText(this.selection),
      documentLanguage: "EnglishUS",
    };
  }

  async apply(
    snapshot: SelectionSnapshot,
    result: string,
    mode: ApplyMode,
  ): Promise<void> {
    if (this.activeSnapshotId !== snapshot.id) {
      throw new SelectionExpiredError();
    }

    if (
      this.selection !== snapshot.text ||
      (await fingerprintText(this.selection)) !== snapshot.fingerprint
    ) {
      throw new StaleSelectionError();
    }

    if (mode === "replace") {
      this.selection = result;
    } else {
      this.insertedText = result;
    }

    this.activeSnapshotId = null;
  }

  async release(snapshot: SelectionSnapshot): Promise<void> {
    if (this.activeSnapshotId === snapshot.id) {
      this.activeSnapshotId = null;
    }
  }

  getDocumentState() {
    return {
      selection: this.selection,
      insertedText: this.insertedText,
    };
  }

  setSelection(text: string) {
    this.selection = text;
  }
}
