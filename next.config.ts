import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local database used when DATABASE_URL is not set) ships a WASM
  // file and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
