import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

import type { AppPhase } from "../types";

interface StatusBannerProps {
  phase: AppPhase;
  message: string;
}

export function StatusBanner({ phase, message }: StatusBannerProps) {
  if (!message) {
    return null;
  }

  const Icon =
    phase === "error" ? AlertCircle : phase === "success" ? CheckCircle2 : LoaderCircle;

  return (
    <div className="status-banner" data-phase={phase} role="status">
      <Icon
        className={
          phase === "reading" ||
          phase === "testing" ||
          phase === "generating" ||
          phase === "applying"
            ? "spin"
            : undefined
        }
        size={16}
      />
      <span>{message}</span>
    </div>
  );
}
