import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format, parseISO } from "date-fns";

interface SessionStats {
  visit_date: string;
  total: number;
  b_0_1m: number;
  b_1_5m: number;
  b_5_15m: number;
  b_15_30m: number;
  b_30m_1h: number;
  b_1h_2h: number;
  b_2h_3h: number;
  b_3h_4h: number;
  b_4h_plus: number;
}

interface SessionsTabProps {
  environment: "dev" | "prod";
}

const BUCKET_COLORS: Record<string, string> = {
  "0–1m": "#ef4444",
  "1–5m": "#f97316",
  "5–15m": "#f59e0b",
  "15–30m": "#eab308",
  "30m–1h": "#84cc16",
  "1–2h": "#22c55e",
  "2–3h": "#3b82f6",
  "3–4h": "#8b5cf6",
  "4h+": "#ec4899",
};

const BUCKETS = [
  { key: "b_0_1m", label: "0–1m", color: BUCKET_COLORS["0–1m"] },
  { key: "b_1_5m", label: "1–5m", color: BUCKET_COLORS["1–5m"] },
  { key: "b_5_15m", label: "5–15m", color: BUCKET_COLORS["5–15m"] },
  { key: "b_15_30m", label: "15–30m", color: BUCKET_COLORS["15–30m"] },
  { key: "b_30m_1h", label: "30m–1h", color: BUCKET_COLORS["30m–1h"] },
  { key: "b_1h_2h", label: "1–2h", color: BUCKET_COLORS["1–2h"] },
  { key: "b_2h_3h", label: "2–3h", color: BUCKET_COLORS["2–3h"] },
  { key: "b_3h_4h", label: "3–4h", color: BUCKET_COLORS["3–4h"] },
  { key: "b_4h_plus", label: "4h+", color: BUCKET_COLORS["4h+"] },
] as const;

export default function SessionsTab({ environment }: SessionsTabProps) {
  const [data, setData] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/sessions?env=${environment}&days=365`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [environment]);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: format(parseISO(d.visit_date), "MMM dd"),
        "0–1m": d.b_0_1m,
        "1–5m": d.b_1_5m,
        "5–15m": d.b_5_15m,
        "15–30m": d.b_15_30m,
        "30m–1h": d.b_30m_1h,
        "1–2h": d.b_1h_2h,
        "2–3h": d.b_2h_3h,
        "3–4h": d.b_3h_4h,
        "4h+": d.b_4h_plus,
      })),
    [data],
  );

  const percentageChartData = useMemo(
    () =>
      data.map((d) => ({
        date: format(parseISO(d.visit_date), "MMM dd"),
        "0–1m": d.total > 0 ? (d.b_0_1m / d.total) * 100 : 0,
        "1–5m": d.total > 0 ? (d.b_1_5m / d.total) * 100 : 0,
        "5–15m": d.total > 0 ? (d.b_5_15m / d.total) * 100 : 0,
        "15–30m": d.total > 0 ? (d.b_15_30m / d.total) * 100 : 0,
        "30m–1h": d.total > 0 ? (d.b_30m_1h / d.total) * 100 : 0,
        "1–2h": d.total > 0 ? (d.b_1h_2h / d.total) * 100 : 0,
        "2–3h": d.total > 0 ? (d.b_2h_3h / d.total) * 100 : 0,
        "3–4h": d.total > 0 ? (d.b_3h_4h / d.total) * 100 : 0,
        "4h+": d.total > 0 ? (d.b_4h_plus / d.total) * 100 : 0,
      })),
    [data],
  );

  const totals = useMemo(() => {
    const zero = {
      total: 0,
      b_0_1m: 0,
      b_1_5m: 0,
      b_5_15m: 0,
      b_15_30m: 0,
      b_30m_1h: 0,
      b_1h_2h: 0,
      b_2h_3h: 0,
      b_3h_4h: 0,
      b_4h_plus: 0,
    };
    if (data.length === 0) return zero;
    return data.reduce(
      (acc, d) => ({
        total: acc.total + d.total,
        b_0_1m: acc.b_0_1m + d.b_0_1m,
        b_1_5m: acc.b_1_5m + d.b_1_5m,
        b_5_15m: acc.b_5_15m + d.b_5_15m,
        b_15_30m: acc.b_15_30m + d.b_15_30m,
        b_30m_1h: acc.b_30m_1h + d.b_30m_1h,
        b_1h_2h: acc.b_1h_2h + d.b_1h_2h,
        b_2h_3h: acc.b_2h_3h + d.b_2h_3h,
        b_3h_4h: acc.b_3h_4h + d.b_3h_4h,
        b_4h_plus: acc.b_4h_plus + d.b_4h_plus,
      }),
      zero,
    );
  }, [data]);

  const lt1m = totals.b_0_1m;
  const lt5m = totals.b_0_1m + totals.b_1_5m;
  const lt15m = lt5m + totals.b_5_15m;
  const gt15m = totals.total - lt15m;

  const pct = (n: number) =>
    totals.total > 0 ? ((n / totals.total) * 100).toFixed(1) + "%" : "—";

  if (loading) {
    return <div className="text-muted-foreground p-4">Loading session data…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>&lt; 1 min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lt1m.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pct(lt1m)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>&lt; 5 min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lt5m.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pct(lt5m)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>&lt; 15 min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lt15m.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pct(lt15m)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>&gt; 15 min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{gt15m.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pct(gt15m)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg / day</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data.length > 0 ? Math.round(totals.total / data.length) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-bucket breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {BUCKETS.map(({ key, label, color }) => {
          const value = totals[key as keyof typeof totals];
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardDescription>
                  <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ backgroundColor: color }} />
                  {label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{pct(value)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stacked bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Session Duration Distribution</CardTitle>
          <CardDescription>Daily breakdown by duration</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {BUCKETS.map(({ label, color }) => (
                <Bar key={label} dataKey={label} stackId="a" fill={color} />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Daily total line chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sessions</CardTitle>
          <CardDescription>Total sessions per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}>
            <LineChart
              data={data.map((d) => ({
                date: format(parseISO(d.visit_date), "MMM dd"),
                total: d.total,
                "< 1m": d.b_0_1m,
                "< 5m": d.b_0_1m + d.b_1_5m,
                "< 15m": d.b_0_1m + d.b_1_5m + d.b_5_15m,
                "> 15m": d.total - (d.b_0_1m + d.b_1_5m + d.b_5_15m),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#ffffff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="< 1m" stroke="#ef4444" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="< 5m" stroke="#f97316" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="< 15m" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="> 15m" stroke="#10b981" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Added stacked percentage chart */}
      <Card>
        <CardHeader>
          <CardTitle>Session Duration Mix Over Time</CardTitle>
          <CardDescription>
            Daily percentage split by duration bucket (100% stacked filled lines)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}>
            <AreaChart data={percentageChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <>
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof value === "number" ? value.toFixed(1) : value}%
                        </span>
                      </>
                    )}
                  />
                }
              />
              <Legend />
              {BUCKETS.map(({ label, color }) => (
                <Area
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stackId="a"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.45}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
