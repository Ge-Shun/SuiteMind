import type { ProviderMode } from "./services/provider-settings";
import type { TransformOperation } from "@suitemind/contracts";

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
  | "customInstructionRequired"
  | "readingContext"
  | "generating"
  | "replacing"
  | "inserting"
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
  | "apiUnavailable";

export interface AppStrings {
  actions: Record<TransformOperation, string>;
  targetLanguages: Record<TargetLanguage, string>;
  previewViews: Record<PreviewView, string>;
  status: Record<StatusMessageKey, string>;
  errors: Record<ErrorMessageKey, string>;
  demo: string;
  transformControls: string;
  editingAction: string;
  targetLanguage: string;
  instruction: string;
  additionalInstruction: string;
  customPlaceholder: string;
  optionalPlaceholder: string;
  stop: string;
  generateFromWord: string;
  reviewResult: string;
  previewMode: string;
  paragraph: string;
  selection: string;
  replace: string;
  insertBelow: string;
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
  apiKeyStorageNotice: string;
  characterCount: (count: number) => string;
}

export const translations: Record<UiLanguage, AppStrings> = {
  en: {
    actions: {
      polish: "Polish",
      rewrite: "Rewrite",
      translate: "Translate",
      summarize: "Summarize",
      continue: "Continue",
      custom: "Custom",
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
      customInstructionRequired: "Enter an instruction for the custom action.",
      readingContext: "Reading Word context...",
      generating: "Generating...",
      replacing: "Replacing selection...",
      inserting: "Inserting result...",
      mockReplaced: "Selection replaced in the browser demo.",
      mockInserted: "Result inserted in the browser demo.",
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
      emptyResponse: "The SuiteMind API returned no response body.",
      incompleteStream: "The SuiteMind API stream ended before completion.",
      apiUnavailable: "SuiteMind API is unavailable.",
    },
    demo: "Demo",
    transformControls: "Transform controls",
    editingAction: "Editing action",
    targetLanguage: "Target language",
    instruction: "Instruction",
    additionalInstruction: "Additional instruction",
    customPlaceholder: "Describe the change",
    optionalPlaceholder: "Optional tone, audience, or constraints",
    stop: "Stop",
    generateFromWord: "Generate from Word",
    reviewResult: "Review result",
    previewMode: "Preview mode",
    paragraph: "Paragraph",
    selection: "Selection",
    replace: "Replace",
    insertBelow: "Insert below",
    generateAgain: "Generate again",
    discardResult: "Discard result",
    switchLanguage: "Switch to Chinese",
    providerSettings: "Provider settings",
    providerMode: "Provider",
    providerModes: {
      suitemind: "SuiteMind API",
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
    apiKeyStorageNotice:
      "Your API key is saved in this add-in's local storage on this device and sent directly to the selected provider. Browser CORS support is required because no relay server is used.",
    characterCount: (count) => `${count.toLocaleString("en")} chars`,
  },
  "zh-CN": {
    actions: {
      polish: "润色",
      rewrite: "改写",
      translate: "翻译",
      summarize: "总结",
      continue: "续写",
      custom: "自定义",
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
      customInstructionRequired: "请输入自定义操作指令。",
      readingContext: "正在读取 Word 上下文...",
      generating: "正在生成...",
      replacing: "正在替换选区...",
      inserting: "正在插入结果...",
      mockReplaced: "已在浏览器演示中替换选区。",
      mockInserted: "已在浏览器演示中插入结果。",
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
      emptyResponse: "SuiteMind API 未返回响应内容。",
      incompleteStream: "SuiteMind API 流式响应在完成前中断。",
      apiUnavailable: "SuiteMind API 当前不可用。",
    },
    demo: "演示",
    transformControls: "文本处理",
    editingAction: "编辑操作",
    targetLanguage: "目标语言",
    instruction: "指令",
    additionalInstruction: "附加要求",
    customPlaceholder: "描述需要的修改",
    optionalPlaceholder: "可选：语气、受众或限制",
    stop: "停止",
    generateFromWord: "从 Word 生成",
    reviewResult: "审阅结果",
    previewMode: "预览模式",
    paragraph: "段落",
    selection: "选区",
    replace: "替换",
    insertBelow: "插入下方",
    generateAgain: "重新生成",
    discardResult: "丢弃结果",
    switchLanguage: "切换到英文",
    providerSettings: "API 设置",
    providerMode: "服务提供方",
    providerModes: {
      suitemind: "SuiteMind API",
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
    apiKeyStorageNotice:
      "API Key 会保存在此插件当前设备的本地存储中，并直接发送给所选模型服务商。当前不使用中转后端，因此服务商必须支持浏览器跨域请求。",
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
