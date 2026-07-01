import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome pour une image Docker legere (server.js + deps minimales).
  output: "standalone",
};

export default nextConfig;
