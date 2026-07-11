import {
  Languages,
  ListCollapse,
  MessageCircleQuestion,
  PenLine,
  Repeat2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { ComponentType } from "react";

import type { TransformOperation } from "@suitemind/contracts";

const actions: Array<{
  operation: TransformOperation;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { operation: "ask", icon: MessageCircleQuestion },
  { operation: "polish", icon: Sparkles },
  { operation: "rewrite", icon: Repeat2 },
  { operation: "translate", icon: Languages },
  { operation: "summarize", icon: ListCollapse },
  { operation: "continue", icon: PenLine },
  { operation: "custom", icon: WandSparkles },
];

interface ActionPickerProps {
  value: TransformOperation;
  disabled?: boolean;
  labels: Record<TransformOperation, string>;
  ariaLabel: string;
  onChange: (operation: TransformOperation) => void;
}

export function ActionPicker({
  value,
  disabled = false,
  labels,
  ariaLabel,
  onChange,
}: ActionPickerProps) {
  return (
    <div className="action-grid" aria-label={ariaLabel}>
      {actions.map(({ operation, icon: Icon }) => (
        <button
          className="action-button"
          data-selected={value === operation}
          disabled={disabled}
          key={operation}
          onClick={() => onChange(operation)}
          type="button"
        >
          <Icon size={16} strokeWidth={1.8} />
          <span>{labels[operation]}</span>
        </button>
      ))}
    </div>
  );
}
