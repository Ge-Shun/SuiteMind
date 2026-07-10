import { diffWordsWithSpace } from "diff";

interface DiffPreviewProps {
  before: string;
  after: string;
  view: "diff" | "before" | "after";
}

export function DiffPreview({ before, after, view }: DiffPreviewProps) {
  if (view === "before" || view === "after") {
    return (
      <div className="preview-text" data-testid="preview-text">
        {view === "before" ? before : after}
      </div>
    );
  }

  const changes = diffWordsWithSpace(before, after);

  return (
    <div className="preview-text diff-text" data-testid="diff-preview">
      {changes.map((part, index) => (
        <span
          className={
            part.added ? "diff-added" : part.removed ? "diff-removed" : undefined
          }
          key={`${index}-${part.value.slice(0, 12)}`}
        >
          {part.value}
        </span>
      ))}
    </div>
  );
}
