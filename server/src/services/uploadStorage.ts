import path from "path";

import { env } from "../config/env";

export function getUploadsDir() {
  return env.UPLOADS_DIR
    ? path.resolve(env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads");
}
