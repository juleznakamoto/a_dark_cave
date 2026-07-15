/** Data sections fetched from split `/api/admin/*` endpoints. */
export type AdminDataSection = "metrics" | "dau" | "saves" | "clicks" | "purchases";

export type AdminTabId =
  | "overview"
  | "engagement"
  | "clicks"
  | "purchases"
  | "referrals"
  | "socialPrompt"
  | "churn"
  | "sleep"
  | "resources"
  | "upgrades"
  | "sessions"
  | "logs"
  | "lookup"
  | "saveAnalysis";

/** Sections each tab needs. Sessions/logs/lookup fetch their own endpoints. */
export const ADMIN_TAB_SECTIONS: Record<AdminTabId, AdminDataSection[]> = {
  overview: ["metrics", "dau", "saves", "purchases"],
  engagement: ["saves"],
  clicks: ["clicks", "saves"],
  purchases: ["purchases", "saves"],
  referrals: ["metrics"],
  socialPrompt: ["saves"],
  churn: ["clicks", "saves"],
  sleep: ["saves"],
  resources: ["clicks", "saves"],
  upgrades: ["saves"],
  sessions: [],
  logs: [],
  lookup: [],
  saveAnalysis: [],
};

export function sectionsForTab(tab: AdminTabId): AdminDataSection[] {
  return ADMIN_TAB_SECTIONS[tab] ?? [];
}
