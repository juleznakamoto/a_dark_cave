import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HutLadderCohortDays } from "@shared/hutLadderAdminStats";

/** DAU, sign-ups, buyers/gain charts: last bucket is `1y` (365 days). */
export type AdminOverviewChartRange = "1m" | "3m" | "6m" | "1y";

/** Purchases, referrals, conversion: last bucket is `12m` (same 365-day span). */
export type AdminTwelveMonthChartRange = "1m" | "3m" | "6m" | "12m";

export const ADMIN_OVERVIEW_CHART_DAYS: Record<AdminOverviewChartRange, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export const ADMIN_TWELVE_MONTH_CHART_DAYS: Record<AdminTwelveMonthChartRange, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

/** Subtitle text for overview charts, e.g. "Last 30 Days". */
export function adminOverviewChartTitleSuffix(range: AdminOverviewChartRange): string {
  switch (range) {
    case "1m":
      return "Last 30 Days";
    case "3m":
      return "Last 3 Months";
    case "6m":
      return "Last 6 Months";
    case "1y":
      return "Last Year";
    default:
      return "Last 30 Days";
  }
}

/** Recharts XAxis `interval` for day-granular series (matches prior admin charts). */
export function adminChartXAxisIntervalForDays(days: number): number {
  if (days <= 30) return 6;
  if (days <= 90) return 13;
  if (days <= 180) return 29;
  return 60;
}

type ChartTimeRangeSelectOverviewProps = {
  value: AdminOverviewChartRange;
  onChange: (range: AdminOverviewChartRange) => void;
  triggerClassName?: string;
};

export function ChartTimeRangeSelectOverview({
  value,
  onChange,
  triggerClassName = "w-[140px]",
}: ChartTimeRangeSelectOverviewProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AdminOverviewChartRange)}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1m">1 Month</SelectItem>
        <SelectItem value="3m">3 Months</SelectItem>
        <SelectItem value="6m">6 Months</SelectItem>
        <SelectItem value="1y">1 Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

type ChartTimeRangeSelectTwelveMonthProps = {
  value: AdminTwelveMonthChartRange;
  onChange: (range: AdminTwelveMonthChartRange) => void;
  triggerClassName?: string;
};

export function ChartTimeRangeSelectTwelveMonth({
  value,
  onChange,
  triggerClassName = "w-[140px]",
}: ChartTimeRangeSelectTwelveMonthProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AdminTwelveMonthChartRange)}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1m">Last Month</SelectItem>
        <SelectItem value="3m">Last 3 Months</SelectItem>
        <SelectItem value="6m">Last 6 Months</SelectItem>
        <SelectItem value="12m">Last 12 Months</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function hutLadderCohortTitleSuffix(days: HutLadderCohortDays): string {
  switch (days) {
    case 3:
      return "Last 3 Days";
    case 7:
      return "Last 7 Days";
    case 30:
      return "Last 30 Days";
    case 60:
      return "Last 60 Days";
    case 90:
      return "Last 90 Days";
    default:
      return "Last 60 Days";
  }
}

type ChartTimeRangeSelectHutLadderProps = {
  value: HutLadderCohortDays;
  onChange: (days: HutLadderCohortDays) => void;
  triggerClassName?: string;
};

export function ChartTimeRangeSelectHutLadder({
  value,
  onChange,
  triggerClassName = "w-[140px]",
}: ChartTimeRangeSelectHutLadderProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v) as HutLadderCohortDays)}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Cohort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="3">Last 3 Days</SelectItem>
        <SelectItem value="7">Last 7 Days</SelectItem>
        <SelectItem value="30">Last 30 Days</SelectItem>
        <SelectItem value="60">Last 60 Days</SelectItem>
        <SelectItem value="90">Last 90 Days</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Sessions intra-day volume: fixed hours + step pairs (always ~24 buckets). */
export type AdminSessionIntradayRange = "48h" | "24h" | "12h" | "6h" | "2h";

export const ADMIN_SESSION_INTRADAY_RANGES: Record<
  AdminSessionIntradayRange,
  { hours: number; stepMinutes: number; label: string; titleSuffix: string }
> = {
  "48h": {
    hours: 48,
    stepMinutes: 120,
    label: "48 Hours",
    titleSuffix: "Last 48 Hours · 2h steps",
  },
  "24h": {
    hours: 24,
    stepMinutes: 60,
    label: "24 Hours",
    titleSuffix: "Last 24 Hours · 1h steps",
  },
  "12h": {
    hours: 12,
    stepMinutes: 30,
    label: "12 Hours",
    titleSuffix: "Last 12 Hours · 30m steps",
  },
  "6h": {
    hours: 6,
    stepMinutes: 15,
    label: "6 Hours",
    titleSuffix: "Last 6 Hours · 15m steps",
  },
  "2h": {
    hours: 2,
    stepMinutes: 5,
    label: "2 Hours",
    titleSuffix: "Last 2 Hours · 5m steps",
  },
};

type ChartTimeRangeSelectSessionIntradayProps = {
  value: AdminSessionIntradayRange;
  onChange: (range: AdminSessionIntradayRange) => void;
  triggerClassName?: string;
};

export function ChartTimeRangeSelectSessionIntraday({
  value,
  onChange,
  triggerClassName = "w-[140px]",
}: ChartTimeRangeSelectSessionIntradayProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AdminSessionIntradayRange)}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent>
        {(
          Object.keys(ADMIN_SESSION_INTRADAY_RANGES) as AdminSessionIntradayRange[]
        ).map((key) => (
          <SelectItem key={key} value={key}>
            {ADMIN_SESSION_INTRADAY_RANGES[key].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
