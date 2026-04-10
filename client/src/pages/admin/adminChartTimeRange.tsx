import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
