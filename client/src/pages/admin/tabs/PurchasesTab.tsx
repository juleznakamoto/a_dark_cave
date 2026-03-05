
import { useState, useMemo } from "react";
import { parseISO, startOfDay, addDays, subDays, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type TimeRange = "1m" | "3m" | "6m" | "12m";

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

const COUNTRY_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7f7f", "#a4de6c",
  "#83a6ed", "#8dd1e1", "#f794a4", "#ffb347", "#d0ed57",
];

const TOP_N_COUNTRIES = 8;

interface PurchasesTabProps {
  purchases: any[];
  getTotalRevenue: () => number;
  getDailyPurchases: () => Array<{ day: string; purchases: number }>;
  getPurchasesByPlaytime: () => Array<{ playtime: string; purchases: number }>;
  getPurchaseStats: () => Array<{ name: string; count: number }>;
  getPurchasesByCountry: () => Array<{ country: string; count: number; revenue: number }>;
  purchasesChartTimeRange: TimeRange;
  setPurchasesChartTimeRange: (range: TimeRange) => void;
}

function buildDailyCountryData(
  purchases: any[],
  days: number,
  mode: "count" | "revenue",
) {
  const now = new Date();
  const start = startOfDay(subDays(now, days - 1));

  const relevant = purchases.filter((p) => {
    if (p.price_paid <= 0 || p.bundle_id) return false;
    return parseISO(p.purchased_at) >= start;
  });

  // Find top N countries by total for this period
  const totals = new Map<string, number>();
  relevant.forEach((p) => {
    const c = p.country || "Unknown";
    totals.set(c, (totals.get(c) ?? 0) + (mode === "count" ? 1 : p.price_paid));
  });

  const topCountries = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N_COUNTRIES)
    .map(([c]) => c);

  // Build one row per day
  const rows: Record<string, any>[] = Array.from({ length: days }, (_, i) => {
    const row: Record<string, any> = { day: format(addDays(start, i), days > 90 ? "MMM d" : "MMM d") };
    topCountries.forEach((c) => (row[c] = 0));
    return row;
  });

  relevant.forEach((p) => {
    const c = p.country || "Unknown";
    if (!topCountries.includes(c)) return;
    const d = startOfDay(parseISO(p.purchased_at));
    const idx = Math.round((d.getTime() - start.getTime()) / 86400000);
    if (idx >= 0 && idx < rows.length) {
      rows[idx][c] = (rows[idx][c] ?? 0) + (mode === "count" ? 1 : p.price_paid);
    }
  });

  return { data: rows, countries: topCountries };
}

function TimeRangeSelect({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Time Range" />
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

export default function PurchasesTab(props: PurchasesTabProps) {
  const {
    purchases,
    getTotalRevenue,
    getDailyPurchases,
    getPurchasesByPlaytime,
    getPurchaseStats,
    purchasesChartTimeRange,
    setPurchasesChartTimeRange,
  } = props;

  const [countryCountRange, setCountryCountRange] = useState<TimeRange>("1m");
  const [countryRevenueRange, setCountryRevenueRange] = useState<TimeRange>("1m");

  const { data: countryCountData, countries: countryCountList } = useMemo(
    () => buildDailyCountryData(purchases, TIME_RANGE_DAYS[countryCountRange], "count"),
    [purchases, countryCountRange],
  );

  const { data: countryRevenueData, countries: countryRevenueList } = useMemo(
    () => buildDailyCountryData(purchases, TIME_RANGE_DAYS[countryRevenueRange], "revenue"),
    [purchases, countryRevenueRange],
  );

  const xAxisInterval = (days: number) => {
    if (days <= 30) return 6;
    if (days <= 90) return 13;
    if (days <= 180) return 29;
    return 60;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">€{(getTotalRevenue() / 100).toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Purchases</CardTitle>
            <CardDescription>Excluding free items and components</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {purchases.filter((p) => p.price_paid > 0 && !p.bundle_id).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Daily Purchases</CardTitle>
              <CardDescription>Purchase activity over time</CardDescription>
            </div>
            <TimeRangeSelect value={purchasesChartTimeRange} onChange={setPurchasesChartTimeRange} />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <AreaChart data={getDailyPurchases()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="purchases" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Daily Sales by Country</CardTitle>
              <CardDescription>Number of purchases per day, top {TOP_N_COUNTRIES} countries (paid only)</CardDescription>
            </div>
            <TimeRangeSelect value={countryCountRange} onChange={setCountryCountRange} />
          </div>
        </CardHeader>
        <CardContent>
          {countryCountList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No country data yet. Country is captured from billing address on new purchases.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <LineChart data={countryCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={xAxisInterval(TIME_RANGE_DAYS[countryCountRange])}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {countryCountList.map((country, i) => (
                  <Line
                    key={country}
                    type="monotone"
                    dataKey={country}
                    stroke={COUNTRY_COLORS[i % COUNTRY_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Daily Revenue by Country</CardTitle>
              <CardDescription>€ revenue per day, top {TOP_N_COUNTRIES} countries (paid only)</CardDescription>
            </div>
            <TimeRangeSelect value={countryRevenueRange} onChange={setCountryRevenueRange} />
          </div>
        </CardHeader>
        <CardContent>
          {countryRevenueList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No country data yet. Country is captured from billing address on new purchases.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <LineChart data={countryRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={xAxisInterval(TIME_RANGE_DAYS[countryRevenueRange])}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickFormatter={(v) => `€${(v / 100).toFixed(0)}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `€${(value / 100).toFixed(2)}`,
                    name,
                  ]}
                />
                <Legend />
                {countryRevenueList.map((country, i) => (
                  <Line
                    key={country}
                    type="monotone"
                    dataKey={country}
                    stroke={COUNTRY_COLORS[i % COUNTRY_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchases by Playtime</CardTitle>
          <CardDescription>
            When do players make purchases? (hourly intervals, excluding free items)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <LineChart data={getPurchasesByPlaytime()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="playtime"
                label={{
                  value: "Playtime (hours)",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Purchases",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="purchases"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchases by Item</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <BarChart data={getPurchaseStats()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {purchases
              .filter((p) => !p.bundle_id)
              .slice(0, 10)
              .map((purchase, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{purchase.item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(purchase.purchased_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-bold">€{(purchase.price_paid / 100).toFixed(2)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
