import type { OfficeAdapter } from "./adapter";
import { MockOfficeAdapter } from "./mock-adapter";
import { WordOfficeAdapter } from "./word-adapter";

const OFFICE_JS_URL = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";

function shouldUseMockOffice(): boolean {
  const query = new URLSearchParams(window.location.search);
  return (
    query.get("mockOffice") === "1" || import.meta.env.VITE_USE_MOCK_OFFICE === "true"
  );
}

async function ensureOfficeJs(): Promise<void> {
  if (typeof Office !== "undefined") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${OFFICE_JS_URL}"]`,
    );
    const script = existing ?? document.createElement("script");
    const timeout = window.setTimeout(() => {
      reject(new Error("Microsoft Office.js did not load in time."));
    }, 15_000);

    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    const fail = () => {
      window.clearTimeout(timeout);
      reject(new Error("Microsoft Office.js could not be loaded."));
    };

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });

    if (!existing) {
      script.src = OFFICE_JS_URL;
      document.head.append(script);
    }
  });
}

export async function createOfficeAdapter(): Promise<OfficeAdapter> {
  if (shouldUseMockOffice()) {
    return new MockOfficeAdapter();
  }

  await ensureOfficeJs();

  if (typeof Office === "undefined") {
    throw new Error(
      "Microsoft Office is unavailable. Open this add-in in Word or use ?mockOffice=1.",
    );
  }

  const info = await Office.onReady();

  if (info.host !== Office.HostType.Word) {
    throw new Error("SuiteMind currently supports Microsoft Word only.");
  }

  return new WordOfficeAdapter();
}

export type { OfficeAdapter } from "./adapter";
export {
  EmptySelectionError,
  SelectionExpiredError,
  StaleSelectionError,
} from "./adapter";
