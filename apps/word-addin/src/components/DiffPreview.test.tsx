import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiffPreview } from "./DiffPreview";

describe("DiffPreview", () => {
  it("renders additions and removals", () => {
    const { container } = render(
      <DiffPreview after="A clear sentence" before="A sentence" view="diff" />,
    );

    expect(screen.getByTestId("diff-preview")).toBeInTheDocument();
    expect(container.querySelector(".diff-added")).not.toBeNull();
  });
});
