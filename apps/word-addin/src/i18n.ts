import type { TransformOperation } from "@suitemind/contracts";

import type { ProviderMode } from "./services/provider-settings";

export type UiLanguage = "en" | "zh-CN";
export type PreviewView = "diff" | "before" | "after";

export const UI_LANGUAGE_STORAGE_KEY = "suitemind-ui-language";

export const targetLanguageValues = [
  "Chinese (Simplified)",
  "English",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Spanish",
] as const;

export type TargetLanguage = (typeof targetLanguageValues)[number];

export type StatusMessageKey =
  | "questionRequired"
  | "editingInstructionRequired"
  | "providerSettingsRequired"
  | "readingContext"
  | "generating"
  | "replacing"
  | "inserting"
  | "answerCopied"
  | "apiKeyCleared"
  | "mockReplaced"
  | "mockInserted"
  | "wordReplaced"
  | "wordInserted";

export type ErrorMessageKey =
  | "fallback"
  | "emptySelection"
  | "staleSelection"
  | "expiredSelection"
  | "selectionTooLong"
  | "emptyProvider"
  | "officeJsTimeout"
  | "officeJsLoad"
  | "officeUnavailable"
  | "wordOnly"
  | "emptyResponse"
  | "incompleteStream"
  | "localProxyUnavailable";

export interface AppStrings {
  actions: Record<TransformOperation, string>;
  targetLanguages: Record<TargetLanguage, string>;
  previewViews: Record<PreviewView, string>;
  status: Record<StatusMessageKey, string>;
  errors: Record<ErrorMessageKey, string>;
  transformControls: string;
  editingAction: string;
  targetLanguage: string;
  question: string;
  questionPlaceholder: string;
  editingInstruction: string;
  editingInstructionPlaceholder: string;
  additionalInstruction: string;
  additionalInstructionPlaceholder: string;
  stop: string;
  generateFromWord: string;
  reviewResult: string;
  answer: string;
  previewMode: string;
  paragraph: string;
  selection: string;
  replace: string;
  insertBelow: string;
  copyAnswer: string;
  generateAgain: string;
  discardResult: string;
  switchLanguage: string;
  providerSettings: string;
  providerMode: string;
  providerModes: Record<ProviderMode, string>;
  apiBaseUrl: string;
  apiKey: string;
  apiKeyPlaceholder: string;
  model: string;
  customProvider: string;
  clearApiKey: string;
  apiKeyStorageNotice: string;
  characterCount: (count: number) => string;
}

export const translations: Record<UiLanguage, AppStrings> = {
  en: {
    actions: {
      ask: "Ask",
      polish: "Polish",
      rewrite: "Rewrite",
      translate: "Translate",
      summarize: "Summarize",
      continue: "Continue",
      custom: "Custom edit",
    },
    targetLanguages: {
      "Chinese (Simplified)": "Chinese (Simplified)",
      English: "English",
      Japanese: "Japanese",
      Korean: "Korean",
      French: "French",
      German: "German",
      Spanish: "Spanish",
    },
    previewViews: {
      diff: "Diff",
      before: "Before",
      after: "After",
    },
    status: {
      questionRequired: "Enter a question first.",
      editingInstructionRequired: "Enter an editing instruction first.",
      providerSettingsRequired:
        "Complete the API base URL, API key, and model in Model settings.",
      readingContext: "Reading Word context...",
      generating: "Generating...",
      replacing: "Replacing selection...",
      inserting: "Inserting result...",
      answerCopied: "Answer copied to the clipboard.",
      apiKeyCleared: "The saved API key was cleared.",
      mockReplaced: "Selection replaced in the browser preview.",
      mockInserted: "Result inserted in the browser preview.",
      wordReplaced: "Selection replaced. Word Undo can restore it.",
      wordInserted: "Result inserted. Word Undo can remove it.",
    },
    errors: {
      fallback: "Something went wrong.",
      emptySelection: "Select text or place the cursor in a non-empty Word paragraph.",
      staleSelection:
        "The Word selection changed. Select the original text and try again.",
      expiredSelection:
        "The saved Word selection is no longer available. Select the text again.",
      selectionTooLong: "The selection is longer than 10,000 characters.",
      emptyProvider: "The AI provider returned an empty result.",
      officeJsTimeout: "Microsoft Office.js did not load in time.",
      officeJsLoad: "Microsoft Office.js could not be loaded.",
      officeUnavailable:
        "Microsoft Office is unavailable. Open this add-in in Word or use ?mockOffice=1.",
      wordOnly: "SuiteMind currently supports Microsoft Word only.",
      emptyResponse: "The AI provider returned no response body.",
      incompleteStream: "The AI provider stream ended before completion.",
      localProxyUnavailable:
        "Direct provider access was blocked and the local proxy is unavailable. Run npm run proxy:local on this computer.",
    },
    transformControls: "AI workspace",
    editingAction: "Action",
    targetLanguage: "Target language",
    question: "Question",
    questionPlaceholder: "Ask a question about the selected Word text",
    editingInstruction: "Editing instruction",
    editingInstructionPlaceholder: "Describe how the selected text should change",
    additionalInstruction: "Additional instruction",
    additionalInstructionPlaceholder: "Optional tone, audience, or constraints",
    stop: "Stop",
    generateFromWord: "Generate from Word",
    reviewResult: "Review result",
    answer: "Answer",
    previewMode: "Preview mode",
    paragraph: "Paragraph",
    selection: "Selection",
    replace: "Replace",
    insertBelow: "Insert below",
    copyAnswer: "Copy answer",
    generateAgain: "Generate again",
    discardResult: "Discard result",
    switchLanguage: "Switch to Chinese",
    providerSettings: "Model settings",
    providerMode: "Provider",
    providerModes: {
      "openai-compatible": "OpenAI-compatible",
      deepseek: "DeepSeek",
      claude: "Claude",
      gemini: "Gemini",
    },
    apiBaseUrl: "API base URL",
    apiKey: "API key",
    apiKeyPlaceholder: "sk-...",
    model: "Model",
    customProvider: "Custom API",
    clearApiKey: "Clear saved API key",
    apiKeyStorageNotice:
      "Your API key is stored persistently in this add-in on this device until you clear it. It is sent to the selected provider directly or through the temporary local proxy, and is never sent to a SuiteMind server.",
    characterCount: (count) => `${count.toLocaleString("en")} chars`,
  },
  "zh-CN": {
    actions: {
      ask: "提问",
      polish: "润色",
      rewrite: "改写",
      translate: "翻译",
      summarize: "总结",
      continue: "续写",
      custom: "自定义修改",
    },
    targetLanguages: {
      "Chinese (Simplified)": "简体中文",
      English: "英语",
      Japanese: "日语",
      Korean: "韩语",
      French: "法语",
      German: "德语",
      Spanish: "西班牙语",
    },
    previewViews: {
      diff: "对比",
      before: "原文",
      after: "结果",
    },
    status: {
      questionRequired: "请先输入问题。",
      editingInstructionRequired: "请先输入修改指令。",
      providerSettingsRequired: "请在模型配置中填写完整的接口地址、API Key 和模型。",
      readingContext: "正在读取 Word 上下文...",
      generating: "正在生成...",
      replacing: "正在替换选区...",
      inserting: "正在插入结果...",
      answerCopied: "回答已复制到剪贴板。",
      apiKeyCleared: "已清除保存的 API Key。",
      mockReplaced: "已在浏览器预览中替换选区。",
      mockInserted: "已在浏览器预览中插入结果。",
      wordReplaced: "已替换选区，可使用 Word 撤销恢复。",
      wordInserted: "已插入结果，可使用 Word 撤销删除。",
    },
    errors: {
      fallback: "发生错误。",
      emptySelection: "请选择文本，或将光标放在非空的 Word 段落中。",
      staleSelection: "Word 中的原文已发生变化，请重新选择后再试。",
      expiredSelection: "保存的 Word 选区已失效，请重新选择文本。",
      selectionTooLong: "选区不能超过 10,000 个字符。",
      emptyProvider: "AI 服务返回了空结果。",
      officeJsTimeout: "Microsoft Office.js 加载超时。",
      officeJsLoad: "无法加载 Microsoft Office.js。",
      officeUnavailable: "Microsoft Office 不可用，请在 Word 中打开插件。",
      wordOnly: "SuiteMind 当前仅支持 Microsoft Word。",
      emptyResponse: "AI 服务未返回响应内容。",
      incompleteStream: "AI 服务的流式响应在完成前中断。",
      localProxyUnavailable:
        "模型接口禁止浏览器直连，且本地代理未运行。请在此电脑上运行 npm run proxy:local。",
    },
    transformControls: "AI 工作区",
    editingAction: "操作",
    targetLanguage: "目标语言",
    question: "问题",
    questionPlaceholder: "针对 Word 中选中的文本进行提问",
    editingInstruction: "修改指令",
    editingInstructionPlaceholder: "描述需要如何修改选中的文本",
    additionalInstruction: "附加要求",
    additionalInstructionPlaceholder: "可选：语气、受众或限制",
    stop: "停止",
    generateFromWord: "从 Word 生成",
    reviewResult: "审阅结果",
    answer: "回答",
    previewMode: "预览模式",
    paragraph: "段落",
    selection: "选区",
    replace: "替换",
    insertBelow: "插入下方",
    copyAnswer: "复制回答",
    generateAgain: "重新生成",
    discardResult: "丢弃结果",
    switchLanguage: "切换到英文",
    providerSettings: "模型配置",
    providerMode: "服务提供方",
    providerModes: {
      "openai-compatible": "OpenAI 兼容接口",
      deepseek: "DeepSeek",
      claude: "Claude",
      gemini: "Gemini",
    },
    apiBaseUrl: "API 接口地址",
    apiKey: "API Key",
    apiKeyPlaceholder: "sk-...",
    model: "模型",
    customProvider: "自定义 API",
    clearApiKey: "清除已保存的 API Key",
    apiKeyStorageNotice:
      "API Key 会持久保存在此插件当前设备中，直到你主动清除。Key 会直接发送给模型服务商，或经临时本地代理转发，不会发送到 SuiteMind 服务器。",
    characterCount: (count) => `${count.toLocaleString("zh-CN")} 字符`,
  },
};

export function getInitialUiLanguage(): UiLanguage {
  try {
    const savedLanguage = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);

    if (savedLanguage === "en" || savedLanguage === "zh-CN") {
      return savedLanguage;
    }
  } catch {
    // Storage can be unavailable in locked-down Office webviews.
  }

  const browserLanguage =
    typeof navigator === "undefined"
      ? "en"
      : navigator.languages?.[0] || navigator.language;

  return browserLanguage?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function persistUiLanguage(language: UiLanguage): void {
  try {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The language still applies to the current session when storage is unavailable.
  }
}
