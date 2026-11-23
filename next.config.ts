import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local database used when DATABASE_URL is not set) ships a WASM
  // file and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The database upgrade files are read from disk when the app starts, so they must
  // travel with the deployed app.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  // "Track an email" is now a pop-up form, so its old address goes to the results page.
  redirects: async () => [{ source: "/new", destination: "/", permanent: false }],
};

export default nextConfig;
