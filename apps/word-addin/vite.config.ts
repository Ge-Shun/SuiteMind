import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { getHttpsServerOptions } from "office-addin-dev-certs";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(async ({ command, mode }) => ({
  plugins: [react()],
  base: "/",
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
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 3000,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./taskpane.html", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
