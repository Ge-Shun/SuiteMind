import { afterEach, describe, expect, it, vi } from "vitest";

import { SelectionExpiredError } from "./adapter";
import { WordOfficeAdapter } from "./word-adapter";

interface FakeParagraph {
  text: string;
  style: string;
  tracked: boolean;
  insertedParagraph: FakeParagraph | null;
  contentControl: FakeContentControl | null;
  load: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  untrack: ReturnType<typeof vi.fn>;
  insertText: ReturnType<typeof vi.fn>;
  insertParagraph: ReturnType<typeof vi.fn>;
  insertContentControl: ReturnType<typeof vi.fn>;
}

interface FakeContentControl {
  title: string;
  tag: string;
  appearance: string;
}

interface FakeRange {
  text: string;
  tracked: boolean;
  insertedParagraph: FakeParagraph | null;
  paragraph: FakeParagraph;
  load: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  untrack: ReturnType<typeof vi.fn>;
  insertText: ReturnType<typeof vi.fn>;
  insertParagraph: ReturnType<typeof vi.fn>;
  paragraphs: {
    getFirst: ReturnType<typeof vi.fn>;
    getLast: ReturnType<typeof vi.fn>;
  };
}

function createParagraph(text: string, style: string): FakeParagraph {
  const paragraph: FakeParagraph = {
    text,
    style,
    tracked: false,
    insertedParagraph: null,
    contentControl: null,
    load: vi.fn(),
    track: vi.fn(() => {
      paragraph.tracked = true;
      return paragraph;
    }),
    untrack: vi.fn(() => {
      paragraph.tracked = false;
      return paragraph;
    }),
    insertText: vi.fn((value: string) => {
      paragraph.text = value;
      return paragraph;
    }),
    insertParagraph: vi.fn((value: string) => {
      const inserted = createParagraph(value, "");
      paragraph.insertedParagraph = inserted;
      return inserted;
    }),
    insertContentControl: vi.fn(() => {
      const contentControl = { title: "", tag: "", appearance: "" };
      paragraph.contentControl = contentControl;
      return contentControl;
    }),
  };

  return paragraph;
}

function createRange(text: string, style = "Normal"): FakeRange {
  const paragraph = createParagraph(text, style);
  const range: FakeRange = {
    text,
    tracked: false,
    insertedParagraph: null,
    paragraph,
    load: vi.fn(),
    track: vi.fn(() => {
      range.tracked = true;
      return range;
    }),
    untrack: vi.fn(() => {
      range.tracked = false;
      return range;
    }),
    insertText: vi.fn((value: string) => {
      range.text = value;
      return range;
    }),
    insertParagraph: vi.fn((value: string) => {
      const inserted = createParagraph(value, "");
      range.insertedParagraph = inserted;
      return inserted;
    }),
    paragraphs: {
      getFirst: vi.fn(() => paragraph),
      getLast: vi.fn(() => paragraph),
    },
  };

  return range;
}

function installFakeWord(initialRange: FakeRange) {
  let selectedRange = initialRange;
  const context = {
    document: {
      getSelection: vi.fn(() => selectedRange),
    },
    sync: vi.fn(async () => undefined),
  };
  const run = vi.fn(
    async (
      objectOrBatch: FakeRange | ((value: typeof context) => Promise<unknown>),
      maybeBatch?: (value: typeof context) => Promise<unknown>,
    ) => {
      const batch = typeof objectOrBatch === "function" ? objectOrBatch : maybeBatch;

      if (!batch) {
        throw new Error("Missing Word.run batch.");
      }

      return batch(context);
    },
  );

  vi.stubGlobal("Word", {
    ContentControlAppearance: {
      boundingBox: "BoundingBox",
    },
    InsertLocation: {
      after: "After",
      replace: "Replace",
    },
    run,
  });

  return {
    context,
    select(range: FakeRange) {
      selectedRange = range;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WordOfficeAdapter", () => {
  it("writes to the tracked original range after the visible selection moves", async () => {
    const original = createRange("Original text");
    const other = createRange("Original text");
    const word = installFakeWord(original);
    const adapter = new WordOfficeAdapter();
    const snapshot = await adapter.readSelection();

    word.select(other);
    await adapter.apply(snapshot, "Updated text", "replace");

    expect(original.insertText).toHaveBeenCalledWith("Updated text", "Replace");
    expect(other.insertText).not.toHaveBeenCalled();
    expect(original.tracked).toBe(false);
  });

  it("inherits the source paragraph style when inserting below", async () => {
    const original = createRange("Original text", "Heading 2");
    installFakeWord(original);
    const adapter = new WordOfficeAdapter();
    const snapshot = await adapter.readSelection();

    await adapter.apply(snapshot, "Inserted text", "insert");

    expect(original.insertParagraph).toHaveBeenCalledWith("Inserted text", "After");
    expect(original.insertedParagraph?.style).toBe("Heading 2");
    expect(original.insertedParagraph?.contentControl).toMatchObject({
      appearance: "BoundingBox",
      tag: "suitemind-draft",
      title: "SuiteMind Draft",
    });
  });

  it("inserts multi-paragraph results as styled Word paragraphs", async () => {
    const original = createRange("Original text", "Quote");
    installFakeWord(original);
    const adapter = new WordOfficeAdapter();
    const snapshot = await adapter.readSelection();

    await adapter.apply(snapshot, "First paragraph\n\nSecond paragraph", "insert");

    expect(original.insertParagraph).toHaveBeenCalledWith("First paragraph", "After");
    expect(original.insertedParagraph?.style).toBe("Quote");
    expect(original.insertedParagraph?.insertParagraph).toHaveBeenCalledWith(
      "Second paragraph",
      "After",
    );
    expect(original.insertedParagraph?.insertedParagraph?.style).toBe("Quote");
    expect(original.insertedParagraph?.contentControl?.tag).toBe("suitemind-draft");
    expect(original.insertedParagraph?.insertedParagraph?.contentControl?.tag).toBe(
      "suitemind-draft",
    );
  });

  it("cannot apply a snapshot after it is released", async () => {
    const original = createRange("Original text");
    installFakeWord(original);
    const adapter = new WordOfficeAdapter();
    const snapshot = await adapter.readSelection();

    await adapter.release(snapshot);

    expect(original.tracked).toBe(false);
    await expect(adapter.apply(snapshot, "Updated", "replace")).rejects.toBeInstanceOf(
      SelectionExpiredError,
    );
  });

  it("uses the current paragraph when the Word selection is empty", async () => {
    const cursor = createRange("");
    cursor.paragraph.text = "Paragraph text";
    installFakeWord(cursor);
    const adapter = new WordOfficeAdapter();
    const snapshot = await adapter.readSelection();

    expect(snapshot.source).toBe("paragraph");
    expect(snapshot.text).toBe("Paragraph text");

    await adapter.apply(snapshot, "Rewritten paragraph", "replace");

    expect(cursor.paragraph.insertText).toHaveBeenCalledWith(
      "Rewritten paragraph",
      "Replace",
    );
    expect(cursor.paragraph.tracked).toBe(false);
  });
});
