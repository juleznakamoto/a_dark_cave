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

interface UtmDashboard {
  days_back: number;
  total_landings: number;
  distinct_sources: number;
  distinct_campaigns: number;
  top_source: string | null;
  attributed_players: number;
  attributed_players_in_range: number;
  attributed_buyers: number;
  attributed_revenue_eur_cents: number;
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
    total_landings: 0,
    distinct_sources: 0,
    distinct_campaigns: 0,
    top_source: null,
    attributed_players: 0,
    attributed_players_in_range: 0,
    attributed_buyers: 0,
    attributed_revenue_eur_cents: 0,
    daily_landings: [],
    daily_attributed_saves: [],
    by_source: [],
    by_medium: [],
    by_campaign: [],
  };
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
        } else {
          setData(emptyDashboard(chartDays));
        }
      })
      .catch(() => setData(emptyDashboard(chartDays)))
      .finally(() => setLoading(false));
  }, [environment, chartDays]);

  const dailyChartData = useMemo(() => {
    const landings = data?.daily_landings ?? [];
    const attributed = data?.daily_attributed_saves ?? [];
    const byDay = new Map<string, { day: string; landings: number; players: number }>();
    for (const row of landings) {
      byDay.set(row.day, {
        day: row.day,
        landings: Number(row.landings) || 0,
        players: 0,
      });
    }
    for (const row of attributed) {
      const existing = byDay.get(row.day) ?? {
        day: row.day,
        landings: 0,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">UTM traffic</h2>
          <p className="text-sm text-muted-foreground">
            Anonymous landings with UTM params, plus first-touch attribution on
            saves. Landing history starts when the beacon shipped; legacy{" "}
            <code className="text-xs">?c=</code> still counts in attributed
            players.
          </p>
        </div>
        <ChartTimeRangeSelectOverview
          value={chartTimeRange}
          onChange={setChartTimeRange}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Landings ({adminOverviewChartTitleSuffix(chartTimeRange)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard.total_landings}</p>
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
            <CardDescription>Distinct sources</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard.distinct_sources}</p>
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
            <CardDescription>Attributed buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard.attributed_buyers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attributed revenue (EUR)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">€{revenueEur}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily UTM landings</CardTitle>
          <CardDescription>
            Landings and new attributed saves ·{" "}
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
                dataKey="landings"
                name="Landings"
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
            <CardDescription>Landing counts in range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart data={dashboard.by_source} layout="vertical" margin={{ left: 24 }}>
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
            <CardDescription>Landing counts in range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart data={dashboard.by_medium} layout="vertical" margin={{ left: 24 }}>
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
