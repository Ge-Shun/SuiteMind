import "dotenv/config";

import { buildApp } from "./app";
import { loadConfig } from "./config";
import { createProvider } from "./providers";

const config = loadConfig();
const provider = createProvider(config);
const app = await buildApp({ config, provider });

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
