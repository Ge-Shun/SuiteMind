import type { ApplyMode, SelectionSnapshot } from "../types";
import {
  createSnapshotId,
  EmptySelectionError,
  fingerprintText,
  type OfficeAdapter,
  StaleSelectionError,
  SelectionExpiredError,
} from "./adapter";

type TrackedTarget =
  | { kind: "selection"; object: Word.Range }
  | { kind: "paragraph"; object: Word.Paragraph };

export class WordOfficeAdapter implements OfficeAdapter {
  readonly mode = "word" as const;
  private trackedTarget: TrackedTarget | null = null;
  private trackedSnapshotId: string | null = null;

  private async releaseTrackedTarget(): Promise<void> {
    const target = this.trackedTarget?.object;
    this.trackedTarget = null;
    this.trackedSnapshotId = null;

    if (!target) {
      return;
    }

    try {
      await Word.run(target, async (context) => {
        target.untrack();
        await context.sync();
      });
    } catch {
      // Word automatically releases tracked objects when the document closes.
    }
  }

  async readSelection(): Promise<SelectionSnapshot> {
    await this.releaseTrackedTarget();

    const contextTarget = await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.load("text");
      await context.sync();

      if (range.text.trim()) {
        range.track();
        await context.sync();
        return {
          source: "selection" as const,
          object: range,
          text: range.text,
        };
      }

      const paragraph = range.paragraphs.getFirst();
      paragraph.load("text");
      paragraph.track();
      await context.sync();

      return {
        source: "paragraph" as const,
        object: paragraph,
        text: paragraph.text,
      };
    });

    this.trackedTarget = {
      kind: contextTarget.source,
      object: contextTarget.object,
    } as TrackedTarget;

    if (!contextTarget.text.trim()) {
      await this.releaseTrackedTarget();
      throw new EmptySelectionError();
    }

    const id = createSnapshotId();
    this.trackedSnapshotId = id;

    return {
      id,
      source: contextTarget.source,
      text: contextTarget.text,
      fingerprint: await fingerprintText(contextTarget.text),
    };
  }

  async apply(
    snapshot: SelectionSnapshot,
    result: string,
    mode: ApplyMode,
  ): Promise<void> {
    const trackedTarget = this.trackedTarget;
    let untracked = false;

    if (!trackedTarget || this.trackedSnapshotId !== snapshot.id) {
      throw new SelectionExpiredError();
    }

    const target = trackedTarget.object;

    try {
      await Word.run(target, async (context) => {
        target.load("text");

        const sourceParagraph =
          trackedTarget.kind === "selection"
            ? trackedTarget.object.paragraphs.getLast()
            : trackedTarget.object;
        sourceParagraph.load("style");
        await context.sync();

        const currentFingerprint = await fingerprintText(target.text);

        if (
          target.text !== snapshot.text ||
          currentFingerprint !== snapshot.fingerprint
        ) {
          throw new StaleSelectionError();
        }

        if (mode === "replace") {
          target.insertText(result, Word.InsertLocation.replace);
        } else {
          const insertedParagraph = target.insertParagraph(
            result,
            Word.InsertLocation.after,
          );

          if (sourceParagraph.style) {
            insertedParagraph.style = sourceParagraph.style;
          }
        }

        target.untrack();
        await context.sync();
        untracked = true;
      });
    } finally {
      if (!untracked) {
        try {
          await Word.run(target, async (context) => {
            target.untrack();
            await context.sync();
          });
        } catch {
          // The document may have closed while the AI request was running.
        }
      }

      this.trackedTarget = null;
      this.trackedSnapshotId = null;
    }
  }

  async release(snapshot: SelectionSnapshot): Promise<void> {
    if (this.trackedSnapshotId === snapshot.id) {
      await this.releaseTrackedTarget();
    }
  }
}
