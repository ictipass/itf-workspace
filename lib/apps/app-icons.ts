export const APP_ICON_KEYS = [
  "app-window",
  "workflow",
  "wallet-cards",
  "graduation-cap",
  "users-round",
  "briefcase-business",
  "chart-combined",
  "shield-check",
  "clipboard-check",
  "file-text",
  "database",
  "wrench",
  "building",
  "hand-coins",
  "megaphone",
  "landmark",
] as const;

export type AppIconKey = (typeof APP_ICON_KEYS)[number];

export const DEFAULT_APP_ICON_KEY: AppIconKey = "app-window";

export const APP_ICON_OPTIONS: ReadonlyArray<{
  key: AppIconKey;
  label: string;
}> = [
  { key: "app-window", label: "General application" },
  { key: "workflow", label: "Workflow & approvals" },
  { key: "wallet-cards", label: "Payments & reimbursement" },
  { key: "graduation-cap", label: "Training & learning" },
  { key: "users-round", label: "People & HR" },
  { key: "briefcase-business", label: "Business operations" },
  { key: "chart-combined", label: "Analytics & intelligence" },
  { key: "shield-check", label: "Compliance & security" },
  { key: "clipboard-check", label: "Tasks & inspections" },
  { key: "file-text", label: "Documents & records" },
  { key: "database", label: "Data & registry" },
  { key: "wrench", label: "Tools & maintenance" },
  { key: "building", label: "Organization & offices" },
  { key: "hand-coins", label: "Finance & grants" },
  { key: "megaphone", label: "Communications" },
  { key: "landmark", label: "Government services" },
] as const;

const appIconKeySet = new Set<string>(APP_ICON_KEYS);

export function isAppIconKey(value: unknown): value is AppIconKey {
  return typeof value === "string" && appIconKeySet.has(value);
}

export function resolveAppIconKey(value: unknown): AppIconKey {
  return isAppIconKey(value) ? value : DEFAULT_APP_ICON_KEY;
}
