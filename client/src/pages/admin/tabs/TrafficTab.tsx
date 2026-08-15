import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import {
  ADMIN_OVERVIEW_CHART_DAYS,
  adminChartXAxisIntervalForDays,
  adminOverviewChartTitleSuffix,
  ChartTimeRangeSelectOverview,
  type AdminOverviewChartRange,
} from "../adminChartTimeRange";
import {
  UTM_CAMPAIGN_LINKS,
  type UtmCampaignLink,
  type UtmCampaignLinkGroup,
} from "@/lib/gameFooterSocialLinks";
import { logger } from "@/lib/logger";

const UTM_LINK_GROUPS: Array<{
  id: UtmCampaignLinkGroup;
  title: string;
  description: string;
}> = [
    {
      id: "inbound",
      title: "Game landing",
      description: "Use these when posting. Landings show up in the charts below.",
    },
    {
      id: "steam_store",
      title: "Steam store (outbound)",
      description: "In-game Steam CTAs. Tracked on Steam, not in this tab.",
    },
  ];

interface UtmDashboard {
  days_back: number;
  total_sessions: number;
  sessions_with_utm: number;
  sessions_without_utm: number;
  total_landings: number;
  distinct_sources: number;
  distinct_campaigns: number;
  top_source: string | null;
  attributed_players: number;
  attributed_players_in_range: number;
  attributed_buyers: number;
  attributed_revenue_eur_cents: number;
  daily_traffic: Array<{
    day: string;
    sessions: number;
    landings: number;
    without_utm: number;
  }>;
  daily_landings: Array<{ day: string; landings: number }>;
  daily_attributed_saves: Array<{ day: string; players: number }>;
  by_source: Array<{ label: string; landings: number }>;
  by_medium: Array<{ label: string; landings: number }>;
  by_campaign: Array<{
    label: string;
    landings: number;
    attributed_players: number;
    buyers: number;
  }>;
  error?: string;
}

interface TrafficTabProps {
  environment: "dev" | "prod";
}

const PIE_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c43",
  "#a4de6c",
  "#d0ed57",
  "#8dd1e1",
  "#83a6ed",
  "#8e4585",
  "#ffa07a",
];

function emptyDashboard(days: number): UtmDashboard {
  return {
    days_back: days,
    total_sessions: 0,
    sessions_with_utm: 0,
    sessions_without_utm: 0,
    total_landings: 0,
    distinct_sources: 0,
    distinct_campaigns: 0,
    top_source: null,
    attributed_players: 0,
    attributed_players_in_range: 0,
    attributed_buyers: 0,
    attributed_revenue_eur_cents: 0,
    daily_traffic: [],
    daily_landings: [],
    daily_attributed_saves: [],
    by_source: [],
    by_medium: [],
    by_campaign: [],
  };
}

function formatPct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function CopyableUtmUrl({ link }: { link: UtmCampaignLink }) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      logger.error("Failed to copy UTM URL:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyUrl()}
      className="w-full rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60"
      title="Click to copy"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{link.label}</p>
          <p className="text-xs text-muted-foreground">{link.description}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {copied ? "Copied" : "Copy"}
        </span>
      </div>
      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
        {link.url}
      </p>
    </button>
  );
}

export default function TrafficTab({ environment }: TrafficTabProps) {
  const [chartTimeRange, setChartTimeRange] =
    useState<AdminOverviewChartRange>("3m");
  const [data, setData] = useState<UtmDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const chartDays = ADMIN_OVERVIEW_CHART_DAYS[chartTimeRange];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/utm?env=${environment}&days=${chartDays}`)
      .then((r) => r.json())
      .then((payload) => {
        if (payload && typeof payload === "object" && !payload.error) {
          setData(payload as UtmDashboard);
        } else if (payload && typeof payload === "object") {
          setData({
            ...emptyDashboard(chartDays),
            ...(payload as Partial<UtmDashboard>),
            error:
              typeof payload.error === "string"
                ? payload.error
                : "Failed to load traffic data",
          });
        } else {
          setData({
            ...emptyDashboard(chartDays),
            error: "Failed to load traffic data",
          });
        }
      })
      .catch(() =>
        setData({
          ...emptyDashboard(chartDays),
          error: "Failed to load traffic data",
        }),
      )
      .finally(() => setLoading(false));
  }, [environment, chartDays]);

  const dailyChartData = useMemo(() => {
    const traffic = data?.daily_traffic ?? [];
    const attributed = data?.daily_attributed_saves ?? [];
    const byDay = new Map<
      string,
      {
        day: string;
        sessions: number;
        landings: number;
        without_utm: number;
        players: number;
      }
    >();

    for (const row of traffic) {
      byDay.set(row.day, {
        day: row.day,
        sessions: Number(row.sessions) || 0,
        landings: Number(row.landings) || 0,
        without_utm: Number(row.without_utm) || 0,
        players: 0,
      });
    }

    // Fallback if older RPC shape without daily_traffic.
    if (traffic.length === 0) {
      for (const row of data?.daily_landings ?? []) {
        byDay.set(row.day, {
          day: row.day,
          sessions: 0,
          landings: Number(row.landings) || 0,
          without_utm: 0,
          players: 0,
        });
      }
    }

    for (const row of attributed) {
      const existing = byDay.get(row.day) ?? {
        day: row.day,
        sessions: 0,
        landings: 0,
        without_utm: 0,
        players: 0,
      };
      existing.players = Number(row.players) || 0;
      byDay.set(row.day, existing);
    }

    return Array.from(byDay.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((row) => ({
        ...row,
        label: format(parseISO(row.day), "MMM dd"),
      }));
  }, [data]);

  const campaignPieData = useMemo(() => {
    const rows = data?.by_campaign ?? [];
    const top = rows.slice(0, 8);
    return top.map((row) => ({
      name: row.label,
      value: Number(row.landings) || 0,
    }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="text-muted-foreground p-4">Loading traffic data…</div>
    );
  }

  const dashboard = data ?? emptyDashboard(chartDays);
  const revenueEur = (dashboard.attributed_revenue_eur_cents / 100).toFixed(2);
  const utmShare = formatPct(
    dashboard.total_landings,
    dashboard.total_sessions,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Traffic</h2>
          <p className="text-sm text-muted-foreground">
            All anonymous sessions vs UTM landings, plus first-touch attribution
            on saves. Daily “without UTM” is sessions minus UTM landings that
            day. Exact session↔UTM overlap needs the shared session id (rolling
            out with the client).
          </p>
        </div>
        <ChartTimeRangeSelectOverview
          value={chartTimeRange}
          onChange={setChartTimeRange}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign URLs</CardTitle>
          <CardDescription>Click a row to copy the full UTM URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {UTM_LINK_GROUPS.map((group) => {
            const links = UTM_CAMPAIGN_LINKS.filter(
              (link) => link.group === group.id,
            );
            return (
              <div key={group.id} className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium">{group.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {links.map((link) => (
                    <CopyableUtmUrl key={link.id} link={link} />
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {dashboard.error ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">
            Traffic query failed: {dashboard.error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Sessions ({adminOverviewChartTitleSuffix(chartTimeRange)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard.total_sessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>UTM landings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard.total_landings}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {utmShare} of sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Without UTM (estimate)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Math.max(
                dashboard.total_sessions - dashboard.total_landings,
                0,
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              sessions − landings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top source</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold truncate">
              {dashboard.top_source ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attributed players (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {dashboard.attributed_players}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attributed revenue (EUR)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">€{revenueEur}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.attributed_buyers} buyers
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily traffic</CardTitle>
          <CardDescription>
            All sessions, UTM landings, and non-UTM remainder ·{" "}
            {adminOverviewChartTitleSuffix(chartTimeRange)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[360px] w-full">
            <AreaChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={adminChartXAxisIntervalForDays(chartDays)}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="without_utm"
                name="Without UTM"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.25}
              />
              <Area
                type="monotone"
                dataKey="landings"
                name="UTM landings"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="players"
                name="Attributed saves"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>By source</CardTitle>
            <CardDescription>UTM landing counts in range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart
                data={dashboard.by_source}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="landings" name="Landings" fill="#8884d8" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By medium</CardTitle>
            <CardDescription>UTM landing counts in range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart
                data={dashboard.by_medium}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="landings" name="Landings" fill="#82ca9d" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Campaign share</CardTitle>
            <CardDescription>Top campaigns by landings</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={campaignPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                >
                  {campaignPieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top campaigns</CardTitle>
            <CardDescription>
              Landings in range; attributed players and buyers are all-time for
              that campaign label
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Campaign</th>
                    <th className="py-2 pr-3 font-medium text-right">Landings</th>
                    <th className="py-2 pr-3 font-medium text-right">Players</th>
                    <th className="py-2 font-medium text-right">Buyers</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.by_campaign.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No UTM landings in this range yet
                      </td>
                    </tr>
                  ) : (
                    dashboard.by_campaign.map((row) => (
                      <tr key={row.label} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium">{row.label}</td>
                        <td className="py-2 pr-3 text-right">{row.landings}</td>
                        <td className="py-2 pr-3 text-right">
                          {row.attributed_players}
                        </td>
                        <td className="py-2 text-right">{row.buyers}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
