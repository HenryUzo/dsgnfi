import "dotenv/config";
import pino from "pino";

import { createApp } from "./app";
import { env } from "./config/env";
import { runtimeDebug } from "./debug/runtimeDebug";

const app = createApp();
const logger = pino();
const port = env.PORT ?? 4000;

app.listen(port, () => {
  logger.info(
    env.NODE_ENV === "development"
      ? {
          port,
          pid: runtimeDebug.pid,
          startedAt: runtimeDebug.startedAt,
          jwtSecretHashPrefix: runtimeDebug.jwtSecretHashPrefix,
          nodeEnv: runtimeDebug.nodeEnv,
        }
      : { port },
    "CMS API server listening"
  );
});
