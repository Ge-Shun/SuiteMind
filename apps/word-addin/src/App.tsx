import type { TransformOperation } from "@suitemind/contracts";
import { ArrowDownToLine, RefreshCw, Replace, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ActionPicker } from "./components/ActionPicker";
import { DiffPreview } from "./components/DiffPreview";
import { StatusBanner } from "./components/StatusBanner";
import {
  getInitialUiLanguage,
  persistUiLanguage,
  targetLanguageValues,
  translations,
  type AppStrings,
  type ErrorMessageKey,
  type PreviewView,
  type StatusMessageKey,
  type TargetLanguage,
  type UiLanguage,
} from "./i18n";
import {
  createOfficeAdapter,
  EmptySelectionError,
  type OfficeAdapter,
  SelectionExpiredError,
  StaleSelectionError,
} from "./office";
import { checkApiHealth, transformText } from "./services/api";
import type { AppPhase, ApplyMode, SelectionSnapshot } from "./types";

type StatusMessage =
  { type: "key"; key: StatusMessageKey } | { type: "error"; error: unknown };

const knownErrorMessages: Record<string, ErrorMessageKey> = {
  "The selection is longer than 10,000 characters.": "selectionTooLong",
  "The AI provider returned an empty result.": "emptyProvider",
  "Microsoft Office.js did not load in time.": "officeJsTimeout",
  "Microsoft Office.js could not be loaded.": "officeJsLoad",
  "Microsoft Office is unavailable. Open this add-in in Word or use ?mockOffice=1.":
    "officeUnavailable",
  "SuiteMind currently supports Microsoft Word only.": "wordOnly",
  "The SuiteMind API returned no response body.": "emptyResponse",
  "The SuiteMind API stream ended before completion.": "incompleteStream",
  "SuiteMind API is unavailable.": "apiUnavailable",
};

function getErrorMessage(error: unknown, text: AppStrings): string {
  if (error instanceof EmptySelectionError) {
    return text.errors.emptySelection;
  }

  if (error instanceof StaleSelectionError) {
    return text.errors.staleSelection;
  }

  if (error instanceof SelectionExpiredError) {
    return text.errors.expiredSelection;
  }

  if (error instanceof Error) {
    const knownMessage = knownErrorMessages[error.message];
    return knownMessage ? text.errors[knownMessage] : error.message;
  }

  return text.errors.fallback;
}

export default function App() {
  const [language, setLanguage] = useState<UiLanguage>(getInitialUiLanguage);
  const [adapter, setAdapter] = useState<OfficeAdapter | null>(null);
  const [operation, setOperation] = useState<TransformOperation>("polish");
  const [instruction, setInstruction] = useState("");
  const [targetLanguage, setTargetLanguage] =
    useState<TargetLanguage>("Chinese (Simplified)");
  const [phase, setPhase] = useState<AppPhase>("ready");
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [snapshot, setSnapshot] = useState<SelectionSnapshot | null>(null);
  const [result, setResult] = useState("");
  const [generationComplete, setGenerationComplete] = useState(false);
  const [previewView, setPreviewView] = useState<PreviewView>("diff");
  const [provider, setProvider] = useState("offline");
  const abortRef = useRef<AbortController | null>(null);
  const text = translations[language];
  const message = statusMessage
    ? statusMessage.type === "key"
      ? text.status[statusMessage.key]
      : getErrorMessage(statusMessage.error, text)
    : "";

  const busy = phase === "reading" || phase === "generating" || phase === "applying";
  const canGenerate = Boolean(adapter) && !busy;

  function invalidateReview() {
    const hasReview = Boolean(snapshot || result);

    if (hasReview) {
      if (adapter && snapshot) {
        void adapter.release(snapshot);
      }
      setSnapshot(null);
      setResult("");
      setGenerationComplete(false);
    }

    if (hasReview || phase === "error" || phase === "success") {
      setStatusMessage(null);
      setPhase("ready");
    }
  }

  function changeOperation(nextOperation: TransformOperation) {
    invalidateReview();
    setOperation(nextOperation);
  }

  useEffect(() => {
    document.documentElement.lang = language;
    persistUiLanguage(language);
  }, [language]);

  useEffect(() => {
    let active = true;

    void createOfficeAdapter()
      .then((officeAdapter) => {
        if (active) {
          setAdapter(officeAdapter);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPhase("error");
          setStatusMessage({ type: "error", error });
        }
      });

    void checkApiHealth()
      .then((health) => {
        if (active) {
          setProvider(health.provider === "mock" ? "mock" : health.model);
        }
      })
      .catch(() => {
        if (active) {
          setProvider("offline");
        }
      });

    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  async function generate() {
    if (!adapter || busy) {
      return;
    }

    if (operation === "custom" && !instruction.trim()) {
      setPhase("error");
      setStatusMessage({ type: "key", key: "customInstructionRequired" });
      return;
    }

    setPhase("reading");
    setStatusMessage({ type: "key", key: "readingContext" });
    setResult("");
    setGenerationComplete(false);
    let currentSnapshot: SelectionSnapshot | null = null;

    try {
      if (snapshot) {
        await adapter.release(snapshot);
        setSnapshot(null);
      }

      currentSnapshot = await adapter.readSelection();

      if (currentSnapshot.text.length > 10_000) {
        throw new Error("The selection is longer than 10,000 characters.");
      }

      setSnapshot(currentSnapshot);
      setPreviewView("after");

      const controller = new AbortController();
      abortRef.current = controller;
      let generated = "";

      setPhase("generating");
      setStatusMessage({ type: "key", key: "generating" });

      await transformText(
        {
          operation,
          text: currentSnapshot.text,
          instruction: instruction.trim(),
          targetLanguage: operation === "translate" ? targetLanguage : null,
          documentLanguage: currentSnapshot.documentLanguage,
        },
        {
          signal: controller.signal,
          onDelta: (text) => {
            generated += text;
            setResult(generated);
          },
          onDone: (event) => {
            if (event.model) {
              setProvider(event.model);
            }
          },
        },
      );

      if (!generated.trim()) {
        throw new Error("The AI provider returned an empty result.");
      }

      setGenerationComplete(true);
      setPreviewView("diff");
      setPhase("review");
      setStatusMessage(null);
    } catch (error) {
      if (currentSnapshot) {
        await adapter.release(currentSnapshot);
      }

      setSnapshot(null);
      setGenerationComplete(false);
      setResult("");

      if (error instanceof DOMException && error.name === "AbortError") {
        setPhase("ready");
        setStatusMessage(null);
      } else {
        setPhase("error");
        setStatusMessage({ type: "error", error });
      }
    } finally {
      abortRef.current = null;
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
  }

  async function applyResult(mode: ApplyMode) {
    if (!adapter || !snapshot || !result || busy) {
      return;
    }

    setPhase("applying");
    setStatusMessage({
      type: "key",
      key: mode === "replace" ? "replacing" : "inserting",
    });

    try {
      await adapter.apply(snapshot, result, mode);
      setPhase("success");
      setStatusMessage({
        type: "key",
        key:
          adapter.mode === "mock"
            ? mode === "replace"
              ? "mockReplaced"
              : "mockInserted"
            : mode === "replace"
              ? "wordReplaced"
              : "wordInserted",
      });
    } catch (error) {
      if (
        error instanceof StaleSelectionError ||
        error instanceof SelectionExpiredError
      ) {
        await adapter.release(snapshot);
        setSnapshot(null);
        setResult("");
        setGenerationComplete(false);
      }

      setPhase("error");
      setStatusMessage({ type: "error", error });
    }
  }

  function discard() {
    if (adapter && snapshot) {
      void adapter.release(snapshot);
    }
    setSnapshot(null);
    setResult("");
    setGenerationComplete(false);
    setStatusMessage(null);
    setPhase("ready");
  }

  return (
    <div className="app-shell" lang={language}>
      <header className="app-header">
        <div className="brand">
          <img alt="" height="28" src="/assets/icon-32.png" width="28" />
          <span>SuiteMind</span>
        </div>
        <div className="header-actions">
          <button
            aria-checked={language === "zh-CN"}
            aria-label={text.switchLanguage}
            className="language-switch"
            onClick={() => setLanguage(language === "en" ? "zh-CN" : "en")}
            role="switch"
            title={text.switchLanguage}
            type="button"
          >
            <span
              aria-hidden="true"
              className="language-option"
              data-active={language === "en"}
            >
              EN
            </span>
            <span aria-hidden="true" className="language-track">
              <span className="language-thumb" />
            </span>
            <span
              aria-hidden="true"
              className="language-option"
              data-active={language === "zh-CN"}
              lang="zh-CN"
            >
              中
            </span>
          </button>
          <div
            className="connection"
            data-online={provider !== "offline"}
            title={provider}
          >
            <span className="connection-dot" />
            <span className="connection-label">
              {adapter?.mode === "mock" ? text.demo : provider}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="controls-section" aria-label={text.transformControls}>
          <ActionPicker
            ariaLabel={text.editingAction}
            disabled={busy}
            labels={text.actions}
            onChange={changeOperation}
            value={operation}
          />

          {operation === "translate" && (
            <label className="field-label">
              <span>{text.targetLanguage}</span>
              <select
                disabled={busy}
                onChange={(event) => {
                  invalidateReview();
                  setTargetLanguage(event.target.value as TargetLanguage);
                }}
                value={targetLanguage}
              >
                {targetLanguageValues.map((target) => (
                  <option key={target} value={target}>
                    {text.targetLanguages[target]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field-label">
            <span>
              {operation === "custom" ? text.instruction : text.additionalInstruction}
            </span>
            <textarea
              disabled={busy}
              maxLength={1_000}
              onChange={(event) => {
                invalidateReview();
                setInstruction(event.target.value);
              }}
              placeholder={
                operation === "custom"
                  ? text.customPlaceholder
                  : text.optionalPlaceholder
              }
              rows={3}
              value={instruction}
            />
          </label>

          {phase === "generating" ? (
            <button
              className="primary-button stop-button"
              onClick={cancelGeneration}
              type="button"
            >
              <Square size={15} fill="currentColor" />
              {text.stop}
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!canGenerate}
              onClick={() => void generate()}
              type="button"
            >
              <Send size={16} />
              {text.generateFromWord}
            </button>
          )}
        </section>

        <StatusBanner message={message} phase={phase} />

        {(phase === "generating" || result) && snapshot && (
          <section className="review-section" aria-label={text.reviewResult}>
            <div className="review-header">
              <div
                className="segmented-control"
                role="tablist"
                aria-label={text.previewMode}
              >
                {(["diff", "before", "after"] as const).map((view) => (
                  <button
                    aria-selected={previewView === view}
                    className="segment-button"
                    key={view}
                    onClick={() => setPreviewView(view)}
                    role="tab"
                    type="button"
                  >
                    {text.previewViews[view]}
                  </button>
                ))}
              </div>
              <div className="review-meta">
                <span className="context-label">
                  {snapshot.source === "paragraph" ? text.paragraph : text.selection}
                </span>
                <span className="character-count">
                  {text.characterCount(result.length)}
                </span>
              </div>
            </div>

            <DiffPreview after={result} before={snapshot.text} view={previewView} />

            {generationComplete &&
              (phase === "review" || phase === "error") &&
              result && (
                <div className="review-actions">
                  <button
                    className="apply-button"
                    onClick={() => void applyResult("replace")}
                    type="button"
                  >
                    <Replace size={16} />
                    {text.replace}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => void applyResult("insert")}
                    type="button"
                  >
                    <ArrowDownToLine size={16} />
                    {text.insertBelow}
                  </button>
                  <button
                    aria-label={text.generateAgain}
                    className="icon-button"
                    onClick={() => void generate()}
                    title={text.generateAgain}
                    type="button"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    aria-label={text.discardResult}
                    className="icon-button"
                    onClick={discard}
                    title={text.discardResult}
                    type="button"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
          </section>
        )}
      </main>
    </div>
  );
}
