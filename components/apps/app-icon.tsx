import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AppWindow,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  HandCoins,
  Landmark,
  Megaphone,
  ShieldCheck,
  UsersRound,
  WalletCards,
  Workflow,
  Wrench,
} from "lucide-react";
import {
  resolveAppIconKey,
  type AppIconKey,
} from "@/lib/apps/app-icons";

const iconComponents: Record<AppIconKey, LucideIcon> = {
  "app-window": AppWindow,
  workflow: Workflow,
  "wallet-cards": WalletCards,
  "graduation-cap": GraduationCap,
  "users-round": UsersRound,
  "briefcase-business": BriefcaseBusiness,
  "chart-combined": ChartNoAxesCombined,
  "shield-check": ShieldCheck,
  "clipboard-check": ClipboardCheck,
  "file-text": FileText,
  database: Database,
  wrench: Wrench,
  building: Building2,
  "hand-coins": HandCoins,
  megaphone: Megaphone,
  landmark: Landmark,
};

type AppIconProps = LucideProps & {
  icon: string | null | undefined;
};

export function AppIcon({ icon, ...props }: AppIconProps) {
  const Icon = iconComponents[resolveAppIconKey(icon)];
  return <Icon aria-hidden="true" {...props} />;
}
