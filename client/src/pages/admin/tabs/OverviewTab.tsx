import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, subDays, startOfDay } from "date-fns";

interface SessionStats {
  visit_date: string;
  total: number;
}

type ConversionRange = "1m" | "3m" | "6m" | "12m";

const CONVERSION_RANGE_DAYS: Record<ConversionRange, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

interface OverviewTabProps {
  environment: "dev" | "prod";
  getDailyActiveUsers: () => number;
  getWeeklyActiveUsers: () => number;
  getMonthlyActiveUsers: () => number;
  totalUserCount: number;
  gameSaves: any[];
  registrationMethodStats: any;
  formatTime: (minutes: number) => string;
  getAveragePlaytime: () => number;
  getAveragePlaytimeToCompletion: () => number;
  getConversionRate: () => number;
  getBuyersPerHundred: () => string;
  getArpuEur: () => string;
  getArpuUsd: () => string;
  getTotalRevenueEurCents: () => number;
  getTotalRevenueUsdCents: () => number;
  getUserRetention: () => Array<{ day: string; users: number }>;
  getDailySignups: () => Array<{ day: string; signups: number }>;
  getHourlySignups: () => Array<{ hour: string; signups: number }>;
  getBuyersPerHundredOverTime: () => Array<{ date: string; buyersPerHundred: number }>;
  getGainPerHundredOverTime: () => Array<{
    date: string;
    gainPerHundredEur: number;
    gainPerHundredUsd: number;
  }>;
  dailyActiveUsersData: Array<{ date: string; active_user_count: number }>;
  chartTimeRange: "1m" | "3m" | "6m" | "1y";
  setChartTimeRange: (range: "1m" | "3m" | "6m" | "1y") => void;
  marketingMetrics?: {
    marketingUsersPrompted: number;
    marketingUsersOptedIn: number;
    marketingOptInRate: number;
  };
  /** Rows in game_saves with user_id cleared after in-app delete (migration 009). */
  accountsDeletedAnonymized: number;
  /** Production only: download Resend CSV in the browser (no files on server/repo). */
  showResendCsvExport?: boolean;
  resendCsvBusy?: null | "marketing" | "no-marketing";
  onResendCsvDownload?: (file: "marketing" | "no-marketing") => void | Promise<void>;
}

export default function OverviewTab(props: OverviewTabProps) {
  const {
    environment,
    getDailyActiveUsers,
    getWeeklyActiveUsers,
    getMonthlyActiveUsers,
    totalUserCount,
    gameSaves,
    registrationMethodStats,
    formatTime,
    getAveragePlaytime,
    getAveragePlaytimeToCompletion,
    getConversionRate,
    getBuyersPerHundred,
    getArpuEur,
    getArpuUsd,
    getTotalRevenueEurCents,
    getTotalRevenueUsdCents,
    getUserRetention,
    getDailySignups,
    getHourlySignups,
    getBuyersPerHundredOverTime,
    getGainPerHundredOverTime,
    dailyActiveUsersData,
    chartTimeRange,
    setChartTimeRange,
    marketingMetrics,
    accountsDeletedAnonymized,
    showResendCsvExport,
    resendCsvBusy,
    onResendCsvDownload,
  } = props;

  const [sessionData, setSessionData] = useState<SessionStats[]>([]);
  const [conversionRange, setConversionRange] = useState<ConversionRange>("1m");

  const prompted = marketingMetrics?.marketingUsersPrompted ?? 0;
  // Deleted users lose their marketing_preferences row (CASCADE); adding anonymized saves
  // approximates a non-legacy cohort comparable to "sign-ups" that hit the consent flow.
  const nonLegacySignupsApprox = prompted + accountsDeletedAnonymized;
  const deletionVsNonLegacyPct =
    nonLegacySignupsApprox > 0
      ? (100 * accountsDeletedAnonymized) / nonLegacySignupsApprox
      : 0;

  useEffect(() => {
    fetch(`/api/admin/sessions?env=${environment}&days=365`)
      .then((r) => r.json())
      .then((d: SessionStats[]) => setSessionData(d))
      .catch(() => setSessionData([]));
  }, [environment]);

  // conversion = signups / (sessions - (DAU - signups))
  //            = signups / (sessions - DAU + signups)
  // Denominator represents estimated "new / anonymous" sessions.
  const conversionChartData = useMemo(() => {
    const days = CONVERSION_RANGE_DAYS[conversionRange];
    const now = new Date();
    const start = startOfDay(subDays(now, days - 1));

    const signupLookup = new Map<string, number>();
    const dailySignups = getDailySignups();
    // getDailySignups() returns "MMM DD" labels — we need raw dates.
    // Rebuild from dailyActiveUsersData date keys instead.
    // Use the raw prop dailyActiveUsersData for DAU and session data for sessions,
    // and re-derive signups from the same UTC date keys.

    // Build DAU lookup by YYYY-MM-DD
    const dauLookup = new Map<string, number>();
    for (const entry of dailyActiveUsersData) {
      dauLookup.set(entry.date.slice(0, 10), entry.active_user_count);
    }

    // Build sessions lookup by YYYY-MM-DD
    const sessionsLookup = new Map<string, number>();
    for (const entry of sessionData) {
      sessionsLookup.set(entry.visit_date.slice(0, 10), entry.total);
    }

    // getDailySignups() gives labelled data aligned to our range — use index mapping
    // Instead, rebuild signups from dailySignups output by position
    const signupsArr = dailySignups; // Array<{ day: "MMM DD", signups: number }>, length=days

    const result: Array<{ date: string; conversion: number | null; signups: number; dau: number; sessions: number }> = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (days - 1 - i),
      ));
      const key = d.toISOString().slice(0, 10);
      const label = signupsArr[i]?.day ?? key;

      const signups = signupsArr[i]?.signups ?? 0;
      const dau = dauLookup.get(key) ?? 0;
      const sessions = sessionsLookup.get(key) ?? 0;

      // denominator = sessions - DAU + signups
      const denom = sessions - dau + signups;
      const conversion = denom > 0 ? parseFloat(((signups / denom) * 100).toFixed(1)) : null;

      result.push({ date: label, conversion, signups, dau, sessions });
    }

    return result;
  }, [conversionRange, dailyActiveUsersData, sessionData, getDailySignups]);

  // Filter and format DAU data based on chartTimeRange
  const getFormattedDailyActiveUsers = () => {
    const now = new Date();
    let days: number;
    switch (chartTimeRange) {
      case "1m":
        days = 30;
        break;
      case "3m":
        days = 90;
        break;
      case "6m":
        days = 180;
        break;
      case "1y":
        days = 365;
        break;
      default:
        days = 30;
    }

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filtered = (dailyActiveUsersData || [])
      .filter(d => {
        const date = parseISO(d.date);
        return date >= cutoffDate;
      })
      .slice()
      .reverse()
      .map(d => ({
        date: format(parseISO(d.date), days > 90 ? "MMM dd" : "MMM dd"),
        users: d.active_user_count,
      }));

    return filtered;
  };

  const formattedDailyActiveUsers = getFormattedDailyActiveUsers();

  const getTimeRangeLabel = () => {
    switch (chartTimeRange) {
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
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>DAU</CardTitle>
            <CardDescription>Daily Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getDailyActiveUsers()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WAU</CardTitle>
            <CardDescription>Weekly Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getWeeklyActiveUsers()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MAU</CardTitle>
            <CardDescription>Monthly Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getMonthlyActiveUsers()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>All registered players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalUserCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Methods</CardTitle>
          <CardDescription>How users are registering for the game</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email Registrations</p>
              <p className="text-3xl font-bold">{registrationMethodStats?.emailRegistrations || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(registrationMethodStats?.emailRegistrations + registrationMethodStats?.googleRegistrations) > 0
                  ? Math.round((registrationMethodStats.emailRegistrations / (registrationMethodStats.emailRegistrations + registrationMethodStats.googleRegistrations)) * 100)
                  : 0}% of registered users
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Google OAuth</p>
              <p className="text-3xl font-bold">{registrationMethodStats?.googleRegistrations || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(registrationMethodStats?.emailRegistrations + registrationMethodStats?.googleRegistrations) > 0
                  ? Math.round((registrationMethodStats.googleRegistrations / (registrationMethodStats.emailRegistrations + registrationMethodStats.googleRegistrations)) * 100)
                  : 0}% of registered users
              </p>
            </div>

            <div>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Email', value: registrationMethodStats?.emailRegistrations || 0 },
                      { name: 'Google', value: registrationMethodStats?.googleRegistrations || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    <Cell fill="#8884d8" />
                    <Cell fill="#82ca9d" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Marketing opt-ins</CardTitle>
            <CardDescription>
              Users who went through the new consent flow (row in{" "}
              <code className="text-xs">marketing_preferences</code>)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {marketingMetrics?.marketingUsersOptedIn ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Currently opted in to marketing emails
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Marketing opt-in rate</CardTitle>
            <CardDescription>% of prompted users who opted in</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(marketingMetrics?.marketingOptInRate ?? 0).toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Prompted: {marketingMetrics?.marketingUsersPrompted ?? 0}{" "}
              (legacy accounts without a row are excluded)
            </p>
          </CardContent>
        </Card>
      </div>

      {showResendCsvExport && onResendCsvDownload ? (
        <Card>
          <CardHeader>
            <CardTitle>Resend contact export (production)</CardTitle>
            <CardDescription>
              Download CSV for{" "}
              <a
                className="underline text-primary"
                href="https://resend.com/docs/dashboard/audiences/contacts"
                target="_blank"
                rel="noopener noreferrer"
              >
                Resend Audience → Import CSV
              </a>
              . Files are generated in memory and saved only to your device — nothing is written
              to the server disk or repo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!!resendCsvBusy}
              onClick={() => onResendCsvDownload("marketing")}
            >
              {resendCsvBusy === "marketing"
                ? "Preparing…"
                : "Download marketing opt-in CSV"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!!resendCsvBusy}
              onClick={() => onResendCsvDownload("no-marketing")}
            >
              {resendCsvBusy === "no-marketing"
                ? "Preparing…"
                : "Download no-marketing CSV"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="py-2 px-3 space-y-0">
            <CardTitle className="text-sm font-medium leading-tight">
              Accounts deleted
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <p className="text-2xl font-bold tabular-nums">
              {accountsDeletedAnonymized}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2 px-3 space-y-0">
            <CardTitle className="text-sm font-medium leading-tight">
              Deletions vs non-legacy sign-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <p className="text-2xl font-bold tabular-nums">
              {deletionVsNonLegacyPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Avg Playtime</CardTitle>
            <CardDescription>All players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatTime(getAveragePlaytime())}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Time to Complete</CardTitle>
            <CardDescription>Completed games only</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatTime(getAveragePlaytimeToCompletion())}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>% of players who finished</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {gameSaves.length > 0
                ? Math.round(
                  (gameSaves.filter(
                    (s) =>
                      s.game_state?.events?.cube15a ||
                      s.game_state?.events?.cube15b ||
                      s.game_state?.events?.cube13 ||
                      s.game_state?.events?.cube14a ||
                      s.game_state?.events?.cube14b ||
                      s.game_state?.events?.cube14c ||
                      s.game_state?.events?.cube14d,
                  ).length /
                    gameSaves.length) *
                  100,
                )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>% who made a purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getConversionRate()}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyers per 100</CardTitle>
            <CardDescription>Non-free purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getBuyersPerHundred()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ARPU</CardTitle>
            <CardDescription>Average revenue per user (same denominator)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">€{getArpuEur()}</p>
            <p className="text-2xl font-bold">${getArpuUsd()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>
              All-time paid totals by charge currency (not combined)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold">
              €{(getTotalRevenueEurCents() / 100).toFixed(2)}
            </p>
            <p className="text-3xl font-bold">
              ${(getTotalRevenueUsdCents() / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Active Users ({getTimeRangeLabel()})</CardTitle>
                <CardDescription>User activity over time</CardDescription>
              </div>
              <Select value={chartTimeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y") => setChartTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={formattedDailyActiveUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Sign-ups ({getTimeRangeLabel()})</CardTitle>
                <CardDescription>New user registrations</CardDescription>
              </div>
              <Select value={chartTimeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y") => setChartTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={getDailySignups()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="signups" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Conversion Rate</CardTitle>
              <CardDescription>
                Sign-ups ÷ (sessions − returning users) — what % of new-visitor sessions convert to a registration
              </CardDescription>
            </div>
            <Select value={conversionRange} onValueChange={(v) => setConversionRange(v as ConversionRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <LineChart data={conversionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                interval={conversionRange === "1m" ? 6 : conversionRange === "3m" ? 13 : conversionRange === "6m" ? 29 : 60}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, "auto"]}
              />
              <Tooltip
                formatter={(value: number | null) =>
                  value == null ? ["—", "Conversion"] : [`${value}%`, "Conversion"]
                }
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="conversion"
                stroke="#ffc658"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
          {sessionData.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Session data not yet loaded — make sure the sessions endpoint is reachable.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hourly Sign-ups (Last 24 Hours)</CardTitle>
          <CardDescription>New user registrations by hour</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <LineChart data={getHourlySignups()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="signups" stroke="#ffc658" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Buyers per 100 Sign-ups ({getTimeRangeLabel()})</CardTitle>
                <CardDescription>Rolling 30-day: buyers per 100 sign-ups in that window</CardDescription>
              </div>
              <Select value={chartTimeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y") => setChartTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={getBuyersPerHundredOverTime()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="buyersPerHundred" stroke="#ff8042" fill="#ff8042" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gain per 100 Sign-ups ({getTimeRangeLabel()})</CardTitle>
                <CardDescription>
                  Rolling 30-day: revenue per 100 sign-ups (EUR vs USD, not summed)
                </CardDescription>
              </div>
              <Select value={chartTimeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y") => setChartTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={getGainPerHundredOverTime()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Legend />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="gainPerHundredEur"
                  name="EUR / 100 sign-ups"
                  stroke="#00C49F"
                  fill="#00C49F"
                />
                <Area
                  type="monotone"
                  dataKey="gainPerHundredUsd"
                  name="USD / 100 sign-ups"
                  stroke="#0088FE"
                  fill="#0088FE"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}