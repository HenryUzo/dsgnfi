import { createHash } from "crypto";

import { env } from "../config/env";

const startedAt = new Date().toISOString();
const jwtSecretHashPrefix = createHash("sha256")
  .update(env.JWT_SECRET)
  .digest("hex")
  .slice(0, 8);

export const runtimeDebug = {
  pid: process.pid,
  startedAt,
  nodeEnv: env.NODE_ENV,
  jwtSecretHashPrefix,
  instanceId: `${process.pid}-${startedAt}`,
} as const;

