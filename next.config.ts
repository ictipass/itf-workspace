import type { NextConfig } from "next";
import {
  resolveWorkspaceOrganizationImportConfiguration,
  resolveWorkspaceServerActionAllowedOrigins,
} from "./lib/config/workspace-environment";

const allowedOrigins = resolveWorkspaceServerActionAllowedOrigins();
const organizationImport = resolveWorkspaceOrganizationImportConfiguration();

// @excel.js/exceljs loads parts of its runtime dependency graph through
// createRequire(). Next.js cannot discover those modules during static output
// tracing, so explicitly package the complete graph used by organization
// workbook imports and template downloads.
const organizationWorkbookRuntimeFiles = [
  "./node_modules/@excel.js/exceljs/**/*",
  "./node_modules/@excel.js/jszip/**/*",
  "./node_modules/es-pako/**/*",
  "./node_modules/fast-csv/**/*",
  "./node_modules/@fast-csv/format/**/*",
  "./node_modules/@fast-csv/parse/**/*",
  "./node_modules/dayjs/**/*",
  "./node_modules/saxes/**/*",
  "./node_modules/xmlchars/**/*",
  "./node_modules/lodash.escaperegexp/**/*",
  "./node_modules/lodash.groupby/**/*",
  "./node_modules/lodash.uniq/**/*",
];

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
  outputFileTracingIncludes: {
    "/dashboard/admin/setup": organizationWorkbookRuntimeFiles,
    "/api/admin/setup/organization-workbook": organizationWorkbookRuntimeFiles,
  },
};

export default nextConfig;
