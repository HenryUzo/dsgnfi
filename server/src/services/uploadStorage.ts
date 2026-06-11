import path from "path";

import { env } from "../config/env";

export function getUploadsDir() {
  return env.STORAGE_LOCAL_PUBLIC_DIR
    ? path.resolve(env.STORAGE_LOCAL_PUBLIC_DIR)
    : env.UPLOADS_DIR
    ? path.resolve(env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads");
}
