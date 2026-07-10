import { describe, expect, it } from "vitest";

import { SelectionExpiredError, StaleSelectionError } from "./adapter";
import { MockOfficeAdapter } from "./mock-adapter";

describe("MockOfficeAdapter", () => {
  it("replaces a matching selection", async () => {
    const adapter = new MockOfficeAdapter();
    const snapshot = await adapter.readSelection();

    await adapter.apply(snapshot, "Updated", "replace");

    expect(adapter.getDocumentState().selection).toBe("Updated");
  });

  it("blocks a stale selection", async () => {
    const adapter = new MockOfficeAdapter();
    const snapshot = await adapter.readSelection();
    adapter.setSelection("Changed in Word");

    await expect(adapter.apply(snapshot, "Updated", "replace")).rejects.toBeInstanceOf(
      StaleSelectionError,
    );
  });

  it("expires a released selection snapshot", async () => {
    const adapter = new MockOfficeAdapter();
    const snapshot = await adapter.readSelection();
    await adapter.release(snapshot);

    await expect(adapter.apply(snapshot, "Updated", "replace")).rejects.toBeInstanceOf(
      SelectionExpiredError,
    );
  });
});
