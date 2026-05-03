import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages so Next.js can compile their TypeScript directly.
  // This is the Next.js 14 native way to handle monorepo cross-package imports.
  transpilePackages: ["@tollgate/agent", "@tollgate/manifest-types"],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tollgate/agent": path.resolve(__dirname, "../../packages/agent/src"),
      "@tollgate/manifest-types": path.resolve(__dirname, "../../shared/manifest-types"),
    }
    return config
  },

  experimental: {
    // Ensure file tracing follows symlinks into workspace packages (Vercel serverless)
    outputFileTracingIncludes: {
      "/api/agent/run": [
        "../../packages/agent/src/**/*",
        "../../shared/manifest-types/**/*",
      ],
    },
  },
}

export default nextConfig
