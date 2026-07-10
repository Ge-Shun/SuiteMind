import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const templatePath = resolve("apps/word-addin/manifest.production.template.xml");
const outputPath = resolve(
  process.env.SUITEMIND_MANIFEST_OUTPUT ?? "apps/word-addin/dist/manifest.xml",
);

function requireHttpsUrl(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }

  return url;
}

function normalizeBaseUrl(name, value) {
  return requireHttpsUrl(name, value).toString().replace(/\/$/, "");
}

function normalizeOrigin(name, value) {
  const url = requireHttpsUrl(name, value);
  return url.origin;
}

function escapeXml(value) {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character],
  );
}

const addinBaseUrl = normalizeBaseUrl(
  "SUITEMIND_ADDIN_URL",
  process.env.SUITEMIND_ADDIN_URL,
);
const addinOrigin = normalizeOrigin(
  "SUITEMIND_ADDIN_ORIGIN",
  process.env.SUITEMIND_ADDIN_ORIGIN ?? addinBaseUrl,
);
const supportUrl = normalizeBaseUrl(
  "SUITEMIND_SUPPORT_URL",
  process.env.SUITEMIND_SUPPORT_URL ?? "https://github.com/Ge-Shun/SuiteMind",
);
const template = readFileSync(templatePath, "utf8");
const manifest = template
  .replaceAll("{{ADDIN_BASE_URL}}", escapeXml(addinBaseUrl))
  .replaceAll("{{ADDIN_ORIGIN}}", escapeXml(addinOrigin))
  .replaceAll("{{SUPPORT_URL}}", escapeXml(supportUrl));

if (/\{\{[A-Z_]+\}\}/.test(manifest)) {
  throw new Error("The production manifest contains unresolved placeholders.");
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, manifest, "utf8");

console.log(`Generated ${outputPath}`);
