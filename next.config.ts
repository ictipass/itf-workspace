import type { NextConfig } from "next";
import { resolveWorkspaceServerActionAllowedOrigins } from "./lib/config/workspace-environment";

const allowedOrigins = resolveWorkspaceServerActionAllowedOrigins();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [...allowedOrigins],
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
