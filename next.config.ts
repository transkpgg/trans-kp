import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    APP_VERSION: pkg.version,
  },
};

export default nextConfig;
