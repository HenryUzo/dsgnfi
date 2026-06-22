import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  typedRoutes: true,
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
