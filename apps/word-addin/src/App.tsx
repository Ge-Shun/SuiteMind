import type { TransformOperation } from "@suitemind/contracts";
import {
  ArrowDownToLine,
  RefreshCw,
  Replace,
  Send,
  Settings,
  Square,
  X,
} from "lucide-react";
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
import {
  getDefaultProviderSettings,
  isDirectProviderMode,
  loadProviderSettings,
  normalizeProviderSettings,
  providerModes,
  saveProviderSettings,
  type ProviderSettings,
} from "./services/provider-settings";
import type { AppPhase, ApplyMode, SelectionSnapshot } from "./types";

const icon32Url = `${import.meta.env.BASE_URL}assets/icon-32.png`;

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
  const [operation, setOperation] = useState<TransformOperation>("custom");
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerSettings, setProviderSettings] =
    useState<ProviderSettings>(loadProviderSettings);
  const abortRef = useRef<AbortController | null>(null);
  const text = translations[language];
  const message = statusMessage
    ? statusMessage.type === "key"
      ? text.status[statusMessage.key]
      : getErrorMessage(statusMessage.error, text)
    : "";

  const busy = phase === "reading" || phase === "generating" || phase === "applying";
  const activeProviderLabel = isDirectProviderMode(providerSettings.mode)
    ? providerSettings.model || text.customProvider
    : provider;
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
    saveProviderSettings(providerSettings);
    if (isDirectProviderMode(providerSettings.mode)) {
      setProvider(providerSettings.model || "custom");
    }
  }, [providerSettings]);

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

    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (isDirectProviderMode(providerSettings.mode)) {
      setProvider(providerSettings.model || "custom");
      return () => {
        active = false;
      };
    }

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
    };
  }, [providerSettings.mode, providerSettings.model]);

  async function generate() {
    if (!adapter || busy) {
      return;
    }

    if (operation === "custom" && !instruction.trim()) {
      setPhase("error");
      setStatusMessage({ type: "key", key: "questionRequired" });
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
        { providerSettings: normalizeProviderSettings(providerSettings) },
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

  function updateProviderSettings(partial: Partial<ProviderSettings>) {
    invalidateReview();
    setProviderSettings((current) => ({ ...current, ...partial }));
  }

  function changeProviderMode(mode: ProviderSettings["mode"]) {
    invalidateReview();
    setProviderSettings((current) => {
      const defaults = getDefaultProviderSettings(mode);

      return {
        ...defaults,
        apiKey: current.mode === mode ? current.apiKey : "",
      };
    });
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
          <img alt="" height="28" src={icon32Url} width="28" />
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
          <button
            aria-expanded={settingsOpen}
            aria-label={text.providerSettings}
            className="settings-button"
            onClick={() => setSettingsOpen((open) => !open)}
            title={text.providerSettings}
            type="button"
          >
            <Settings size={15} />
          </button>
          <div
            className="connection"
            data-online={
              isDirectProviderMode(providerSettings.mode) || provider !== "offline"
            }
            title={activeProviderLabel}
          >
            <span className="connection-dot" />
            <span className="connection-label">
              {adapter?.mode === "mock" ? text.demo : activeProviderLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {settingsOpen && (
          <section className="settings-panel" aria-label={text.providerSettings}>
            <label className="field-label">
              <span>{text.providerMode}</span>
              <select
                disabled={busy}
                onChange={(event) =>
                  changeProviderMode(event.target.value as ProviderSettings["mode"])
                }
                value={providerSettings.mode}
              >
                {providerModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {text.providerModes[mode]}
                  </option>
                ))}
              </select>
            </label>

            {isDirectProviderMode(providerSettings.mode) && (
              <>
                <label className="field-label">
                  <span>{text.apiBaseUrl}</span>
                  <input
                    disabled={busy}
                    onChange={(event) =>
                      updateProviderSettings({ baseUrl: event.target.value })
                    }
                    placeholder="https://api.openai.com/v1"
                    type="url"
                    value={providerSettings.baseUrl}
                  />
                </label>
                <label className="field-label">
                  <span>{text.apiKey}</span>
                  <input
                    autoComplete="off"
                    disabled={busy}
                    onChange={(event) =>
                      updateProviderSettings({ apiKey: event.target.value })
                    }
                    placeholder={text.apiKeyPlaceholder}
                    type="password"
                    value={providerSettings.apiKey}
                  />
                </label>
                <label className="field-label">
                  <span>{text.model}</span>
                  <input
                    disabled={busy}
                    onChange={(event) =>
                      updateProviderSettings({ model: event.target.value })
                    }
                    placeholder="gpt-4o-mini"
                    value={providerSettings.model}
                  />
                </label>
                <p className="settings-note">{text.apiKeyStorageNotice}</p>
              </>
            )}
          </section>
        )}
        <section className="controls-section" aria-label={text.transformControls}>
          <label className="field-label question-field">
            <span>{text.question}</span>
            <textarea
              disabled={busy}
              maxLength={1_000}
              onChange={(event) => {
                invalidateReview();
                setInstruction(event.target.value);
              }}
              placeholder={text.questionPlaceholder}
              rows={4}
              value={instruction}
            />
          </label>

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
