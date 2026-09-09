import type { NextConfig } from "next";
import {
  resolveWorkspaceOrganizationImportConfiguration,
  resolveWorkspaceServerActionAllowedOrigins,
} from "./lib/config/workspace-environment";

const allowedOrigins = resolveWorkspaceServerActionAllowedOrigins();
const organizationImport = resolveWorkspaceOrganizationImportConfiguration();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [...allowedOrigins],
      // Multipart framing needs limited headroom beyond the validated file bytes.
      bodySizeLimit: organizationImport.maxFileBytes + 512 * 1024,
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
