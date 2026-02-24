import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  total_sessions: number;
  lt_15m: number;
  gte_15m: number;
  lt_30m: number;
  lt_1h: number;
  lt_2h: number;
  lt_3h: number;
  lt_4h: number;
  gte_4h: number;
}

interface SessionsTabProps {
  environment: "dev" | "prod";
}

const BUCKET_COLORS: Record<string, string> = {
  lt_15m: "#ef4444",
  "15m-30m": "#f97316",
  "30m-1h": "#eab308",
  "1h-2h": "#22c55e",
  "2h-3h": "#3b82f6",
  "3h-4h": "#8b5cf6",
  "4h+": "#ec4899",
};

export default function SessionsTab({ environment }: SessionsTabProps) {
  const [data, setData] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"30" | "90" | "365">("30");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/sessions?env=${environment}&days=${range}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [environment, range]);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: format(parseISO(d.visit_date), "MMM dd"),
        "< 15m": d.lt_15m,
        "> 15m": d.gte_15m,
        "< 30m": d.lt_30m,
        "< 1h": d.lt_1h,
        "< 2h": d.lt_2h,
        "< 3h": d.lt_3h,
        "< 4h": d.lt_4h,
        total: d.total_sessions,
      })),
    [data],
  );

  const stackedData = useMemo(
    () =>
      data.map((d) => {
        const b15_30 = d.lt_30m - d.lt_15m;
        const b30_1h = d.lt_1h - d.lt_30m;
        const b1h_2h = d.lt_2h - d.lt_1h;
        const b2h_3h = d.lt_3h - d.lt_2h;
        const b3h_4h = d.lt_4h - d.lt_3h;
        return {
          date: format(parseISO(d.visit_date), "MMM dd"),
          "< 15m": d.lt_15m,
          "15m-30m": Math.max(0, b15_30),
          "30m-1h": Math.max(0, b30_1h),
          "1h-2h": Math.max(0, b1h_2h),
          "2h-3h": Math.max(0, b2h_3h),
          "3h-4h": Math.max(0, b3h_4h),
          "4h+": d.gte_4h,
        };
      }),
    [data],
  );

  const totals = useMemo(() => {
    if (data.length === 0)
      return {
        total: 0,
        lt_15m: 0,
        gte_15m: 0,
        lt_30m: 0,
        lt_1h: 0,
        lt_2h: 0,
        lt_3h: 0,
        lt_4h: 0,
        gte_4h: 0,
      };
    return data.reduce(
      (acc, d) => ({
        total: acc.total + d.total_sessions,
        lt_15m: acc.lt_15m + d.lt_15m,
        gte_15m: acc.gte_15m + d.gte_15m,
        lt_30m: acc.lt_30m + d.lt_30m,
        lt_1h: acc.lt_1h + d.lt_1h,
        lt_2h: acc.lt_2h + d.lt_2h,
        lt_3h: acc.lt_3h + d.lt_3h,
        lt_4h: acc.lt_4h + d.lt_4h,
        gte_4h: acc.gte_4h + d.gte_4h,
      }),
      {
        total: 0,
        lt_15m: 0,
        gte_15m: 0,
        lt_30m: 0,
        lt_1h: 0,
        lt_2h: 0,
        lt_3h: 0,
        lt_4h: 0,
        gte_4h: 0,
      },
    );
  }, [data]);

  const pct = (n: number) =>
    totals.total > 0 ? ((n / totals.total) * 100).toFixed(1) + "%" : "0%";

  if (loading) {
    return <div className="text-muted-foreground p-4">Loading session data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as "30" | "90" | "365")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <CardDescription>&lt; 15 min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.lt_15m.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pct(totals.lt_15m)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>&gt; 15 min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.gte_15m.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pct(totals.gte_15m)}</p>
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

      {/* Bucket breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "< 30 min", value: totals.lt_30m },
          { label: "< 1 hour", value: totals.lt_1h },
          { label: "< 2 hours", value: totals.lt_2h },
          { label: "< 3 hours", value: totals.lt_3h },
          { label: "< 4 hours", value: totals.lt_4h },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{pct(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stacked bar chart: session duration distribution over time */}
      <Card>
        <CardHeader>
          <CardTitle>Session Duration Distribution</CardTitle>
          <CardDescription>Daily breakdown by duration bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}>
            <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="< 15m" stackId="a" fill={BUCKET_COLORS["lt_15m"]} />
              <Bar dataKey="15m-30m" stackId="a" fill={BUCKET_COLORS["15m-30m"]} />
              <Bar dataKey="30m-1h" stackId="a" fill={BUCKET_COLORS["30m-1h"]} />
              <Bar dataKey="1h-2h" stackId="a" fill={BUCKET_COLORS["1h-2h"]} />
              <Bar dataKey="2h-3h" stackId="a" fill={BUCKET_COLORS["2h-3h"]} />
              <Bar dataKey="3h-4h" stackId="a" fill={BUCKET_COLORS["3h-4h"]} />
              <Bar dataKey="4h+" stackId="a" fill={BUCKET_COLORS["4h+"]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Line chart: daily totals + key thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sessions</CardTitle>
          <CardDescription>Total sessions and key thresholds over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#ffffff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="< 15m" stroke={BUCKET_COLORS["lt_15m"]} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="> 15m" stroke="#10b981" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
