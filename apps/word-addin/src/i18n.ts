import type { TransformOperation } from "@suitemind/contracts";

import type { ProviderMode } from "./services/provider-settings";
import type { ProviderBaseUrlIssue } from "./services/provider-settings";

export type UiLanguage = "en" | "zh-CN";
export type PreviewView = "diff" | "before" | "after";
export type ConnectorStatus = "checking" | "ready" | "unavailable";

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
  | "testingProviderConnection"
  | "providerConnectionDirect"
  | "providerConnectionLocalProxy"
  | "readingContext"
  | "generating"
  | "generatingChunkedResult"
  | "combiningChunkedResult"
  | "replacing"
  | "inserting"
  | "answerCopied"
  | "apiKeyCleared"
  | "mockReplaced"
  | "mockInserted"
  | "wordReplaced"
  | "wordInserted"
  | "wordDraftInserted";

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
  | "localProxyUnavailable"
  | "providerSettingsRequiredError"
  | "invalidRequest"
  | "malformedProviderStream";

export interface AppStrings {
  actions: Record<TransformOperation, string>;
  targetLanguages: Record<TargetLanguage, string>;
  previewViews: Record<PreviewView, string>;
  status: Record<StatusMessageKey, string>;
  errors: Record<ErrorMessageKey, string>;
  transformControls: string;
  editingAction: string;
  askMode: string;
  editMode: string;
  backToWorkspace: string;
  editingTools: string;
  expandEditingTools: string;
  collapseEditingTools: string;
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
  baseUrlIssues: Record<ProviderBaseUrlIssue, string>;
  apiKey: string;
  apiKeyPlaceholder: string;
  model: string;
  recommendedModel: string;
  customModel: string;
  customProvider: string;
  clearApiKey: string;
  testProviderConnection: string;
  expandProviderSettings: string;
  collapseProviderSettings: string;
  apiKeyStorageNotice: string;
  connectorTitle: string;
  connectorStatuses: Record<ConnectorStatus, string>;
  startConnector: string;
  downloadConnector: string;
  retryConnector: string;
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
      testingProviderConnection: "Testing model connection...",
      providerConnectionDirect:
        "Model connection works through direct provider access.",
      providerConnectionLocalProxy:
        "Model connection works through the local provider proxy.",
      readingContext: "Reading Word context...",
      generating: "Generating...",
      generatingChunkedResult: "Generating long document chunks...",
      combiningChunkedResult: "Combining long document results...",
      replacing: "Replacing selection...",
      inserting: "Inserting result...",
      answerCopied: "Answer copied to the clipboard.",
      apiKeyCleared: "The API key was cleared from this session.",
      mockReplaced: "Selection replaced in the browser preview.",
      mockInserted: "Result inserted in the browser preview.",
      wordReplaced: "Selection replaced. Word Undo can restore it.",
      wordInserted: "Result inserted. Word Undo can remove it.",
      wordDraftInserted:
        "Result inserted as a SuiteMind draft block. Word Undo can remove it.",
    },
    errors: {
      fallback: "Something went wrong.",
      emptySelection: "Select text or place the cursor in a non-empty Word paragraph.",
      staleSelection:
        "The Word selection changed. Select the original text and try again.",
      expiredSelection:
        "The saved Word selection is no longer available. Select the text again.",
      selectionTooLong: "The selection is longer than 60,000 characters.",
      emptyProvider: "The AI provider returned an empty result.",
      officeJsTimeout: "Microsoft Office.js did not load in time.",
      officeJsLoad: "Microsoft Office.js could not be loaded.",
      officeUnavailable:
        "Microsoft Office is unavailable. Open this add-in in Word or use ?mockOffice=1.",
      wordOnly: "SuiteMind currently supports Microsoft Word only.",
      emptyResponse: "The AI provider returned no response body.",
      incompleteStream: "The AI provider stream ended before completion.",
      localProxyUnavailable:
        "Direct provider access was blocked. Install or start SuiteMind Connector, then try again.",
      providerSettingsRequiredError:
        "Complete the API base URL, API key, and model in Model settings.",
      invalidRequest: "The request is invalid. Check the selected action and inputs.",
      malformedProviderStream:
        "The AI provider returned a malformed streaming response.",
    },
    transformControls: "AI workspace",
    editingAction: "Action",
    askMode: "Ask",
    editMode: "Edit",
    backToWorkspace: "Back to workspace",
    editingTools: "Editing tools",
    expandEditingTools: "Show editing tools",
    collapseEditingTools: "Hide editing tools",
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
      openai: "OpenAI (Responses)",
      "openai-compatible": "OpenAI-compatible",
      deepseek: "DeepSeek",
      claude: "Claude",
      gemini: "Gemini",
    },
    apiBaseUrl: "API base URL",
    baseUrlIssues: {
      required: "Enter an API base URL.",
      invalid: "Enter a valid API base URL.",
      insecure:
        "Use HTTPS for provider URLs. HTTP is allowed only for localhost testing.",
    },
    apiKey: "API key",
    apiKeyPlaceholder: "sk-...",
    model: "Model",
    recommendedModel: "Recommended model",
    customModel: "Custom model",
    customProvider: "Custom API",
    clearApiKey: "Clear API key",
    testProviderConnection: "Test connection",
    expandProviderSettings: "Expand provider settings",
    collapseProviderSettings: "Collapse provider settings",
    apiKeyStorageNotice:
      "Your API key stays only in this task pane session and is removed when the pane reloads or closes. It is sent to the selected provider directly or through the temporary local proxy, and is never sent to a SuiteMind server.",
    connectorTitle: "Desktop connector",
    connectorStatuses: {
      checking: "Checking local connection...",
      ready: "Ready for requests that require local forwarding.",
      unavailable: "Not running. Start it or download the Windows connector.",
    },
    startConnector: "Start connector",
    downloadConnector: "Download",
    retryConnector: "Check again",
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
      testingProviderConnection: "正在测试模型连接...",
      providerConnectionDirect: "模型连接正常，当前可直连服务商接口。",
      providerConnectionLocalProxy: "模型连接正常，当前通过本地代理访问服务商接口。",
      readingContext: "正在读取 Word 上下文...",
      generating: "正在生成...",
      generatingChunkedResult: "正在分段处理长文档...",
      combiningChunkedResult: "正在合并长文档结果...",
      replacing: "正在替换选区...",
      inserting: "正在插入结果...",
      answerCopied: "回答已复制到剪贴板。",
      apiKeyCleared: "已从当前会话中清除 API Key。",
      mockReplaced: "已在浏览器预览中替换选区。",
      mockInserted: "已在浏览器预览中插入结果。",
      wordReplaced: "已替换选区，可使用 Word 撤销恢复。",
      wordInserted: "已插入结果，可使用 Word 撤销删除。",
      wordDraftInserted: "已作为 SuiteMind 草稿区插入，可使用 Word 撤销删除。",
    },
    errors: {
      fallback: "发生错误。",
      emptySelection: "请选择文本，或将光标放在非空的 Word 段落中。",
      staleSelection: "Word 中的原文已发生变化，请重新选择后再试。",
      expiredSelection: "保存的 Word 选区已失效，请重新选择文本。",
      selectionTooLong: "选区不能超过 60,000 个字符。",
      emptyProvider: "AI 服务返回了空结果。",
      officeJsTimeout: "Microsoft Office.js 加载超时。",
      officeJsLoad: "无法加载 Microsoft Office.js。",
      officeUnavailable: "Microsoft Office 不可用，请在 Word 中打开插件。",
      wordOnly: "SuiteMind 当前仅支持 Microsoft Word。",
      emptyResponse: "AI 服务未返回响应内容。",
      incompleteStream: "AI 服务的流式响应在完成前中断。",
      localProxyUnavailable:
        "模型接口禁止浏览器直连。请安装或启动 SuiteMind 桌面连接器，然后重试。",
      providerSettingsRequiredError:
        "请在模型配置中填写完整的接口地址、API Key 和模型。",
      invalidRequest: "请求无效，请检查当前操作和输入内容。",
      malformedProviderStream: "AI 服务返回了格式异常的流式响应。",
    },
    transformControls: "AI 工作区",
    editingAction: "操作",
    askMode: "提问",
    editMode: "编辑",
    backToWorkspace: "返回工作区",
    editingTools: "编辑工具",
    expandEditingTools: "呼出编辑工具",
    collapseEditingTools: "收起编辑工具",
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
      openai: "OpenAI（Responses）",
      "openai-compatible": "OpenAI 兼容接口",
      deepseek: "DeepSeek",
      claude: "Claude",
      gemini: "Gemini",
    },
    apiBaseUrl: "API 接口地址",
    baseUrlIssues: {
      required: "请填写 API 接口地址。",
      invalid: "请填写有效的 API 接口地址。",
      insecure: "模型接口地址应使用 HTTPS；仅本机测试允许使用 HTTP。",
    },
    apiKey: "API Key",
    apiKeyPlaceholder: "sk-...",
    model: "模型",
    recommendedModel: "推荐模型",
    customModel: "自定义模型",
    customProvider: "自定义 API",
    clearApiKey: "清除 API Key",
    testProviderConnection: "测试连接",
    expandProviderSettings: "展开服务提供方配置",
    collapseProviderSettings: "收起服务提供方配置",
    apiKeyStorageNotice:
      "API Key 仅保留在当前任务窗格会话中，刷新或关闭后会自动清除。Key 会直接发送给模型服务商，或经临时本地代理转发，不会发送到 SuiteMind 服务器。",
    connectorTitle: "桌面连接器",
    connectorStatuses: {
      checking: "正在检查本地连接...",
      ready: "连接正常，可处理需要本地转发的模型请求。",
      unavailable: "未运行，请启动或下载 Windows 连接器。",
    },
    startConnector: "启动连接器",
    downloadConnector: "下载",
    retryConnector: "重新检测",
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
