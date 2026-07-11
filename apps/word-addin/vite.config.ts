import { fileURLToPath, URL } from "node:url";

import { getHttpsServerOptions } from "office-addin-dev-certs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function normalizeBasePath(value: string | undefined): string {
  if (!value) {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(async ({ command, mode }) => ({
  plugins: [react()],
  base: normalizeBasePath(process.env.VITE_ADDIN_BASE_PATH),
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    https:
      command === "serve" && mode !== "test"
        ? await getHttpsServerOptions()
        : undefined,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 3000,
  },
  build: {
    outDir: "dist",
    sourcemap: mode !== "production",
    rollupOptions: {
      input: fileURLToPath(new URL("./taskpane.html", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
