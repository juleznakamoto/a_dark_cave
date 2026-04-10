import {
  formatPurchaseMinorUnits,
  isUsdPurchaseCurrency,
} from "@shared/purchaseRevenueEur";
import { useState, useMemo } from "react";
import { parseISO, startOfDay, addDays, subDays, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ADMIN_TWELVE_MONTH_CHART_DAYS,
  adminChartXAxisIntervalForDays,
  ChartTimeRangeSelectTwelveMonth,
  type AdminTwelveMonthChartRange,
} from "../adminChartTimeRange";

const COUNTRY_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7f7f", "#a4de6c",
  "#83a6ed", "#8dd1e1", "#f794a4", "#ffb347", "#d0ed57",
];

const TOP_N_COUNTRIES = 8;

interface PurchasesTabProps {
  purchases: any[];
  getTotalRevenueEurCents: () => number;
  getTotalRevenueUsdCents: () => number;
  getDailyPurchases: () => Array<{ day: string; purchases: number }>;
  getPurchasesByPlaytime: () => Array<{ playtime: string; purchases: number }>;
  getPurchaseStats: () => Array<{ name: string; count: number }>;
  purchasesChartTimeRange: AdminTwelveMonthChartRange;
  setPurchasesChartTimeRange: (range: AdminTwelveMonthChartRange) => void;
}

type CountryChartMode = "count" | "revenue_eur" | "revenue_usd";

function countryContribution(p: any, mode: CountryChartMode): number {
  if (mode === "count") return 1;
  if (mode === "revenue_eur") {
    return isUsdPurchaseCurrency(p.currency) ? 0 : p.price_paid;
  }
  return isUsdPurchaseCurrency(p.currency) ? p.price_paid : 0;
}

function buildDailyCountryData(
  purchases: any[],
  days: number,
  mode: CountryChartMode,
) {
  const now = new Date();
  const start = startOfDay(subDays(now, days - 1));

  const relevant = purchases.filter((p) => {
    if (p.price_paid <= 0 || p.bundle_id) return false;
    return parseISO(p.purchased_at) >= start;
  });

  const totals = new Map<string, number>();
  relevant.forEach((p) => {
    const add = countryContribution(p, mode);
    if (mode !== "count" && add <= 0) return;
    const c = p.country || "Unknown";
    totals.set(c, (totals.get(c) ?? 0) + add);
  });

  const topCountries = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N_COUNTRIES)
    .map(([c]) => c);

  const rows: Record<string, any>[] = Array.from({ length: days }, (_, i) => {
    const row: Record<string, any> = {
      day: format(addDays(start, i), days > 90 ? "MMM d" : "MMM d"),
    };
    topCountries.forEach((c) => (row[c] = 0));
    return row;
  });

  relevant.forEach((p) => {
    const c = p.country || "Unknown";
    if (!topCountries.includes(c)) return;
    const add = countryContribution(p, mode);
    if (mode !== "count" && add <= 0) return;
    const d = startOfDay(parseISO(p.purchased_at));
    const idx = Math.round((d.getTime() - start.getTime()) / 86400000);
    if (idx >= 0 && idx < rows.length) {
      rows[idx][c] = (rows[idx][c] ?? 0) + add;
    }
  });

  return { data: rows, countries: topCountries };
}

export default function PurchasesTab(props: PurchasesTabProps) {
  const {
    purchases,
    getTotalRevenueEurCents,
    getTotalRevenueUsdCents,
    getDailyPurchases,
    getPurchasesByPlaytime,
    getPurchaseStats,
    purchasesChartTimeRange,
    setPurchasesChartTimeRange,
  } = props;

  const [countryCountRange, setCountryCountRange] = useState<AdminTwelveMonthChartRange>("1m");
  const [countryRevenueRange, setCountryRevenueRange] = useState<AdminTwelveMonthChartRange>("1m");

  const { data: countryCountData, countries: countryCountList } = useMemo(
    () =>
      buildDailyCountryData(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[countryCountRange],
        "count",
      ),
    [purchases, countryCountRange],
  );

  const { data: countryRevenueEurData, countries: countryRevenueEurList } = useMemo(
    () =>
      buildDailyCountryData(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[countryRevenueRange],
        "revenue_eur",
      ),
    [purchases, countryRevenueRange],
  );

  const { data: countryRevenueUsdData, countries: countryRevenueUsdList } = useMemo(
    () =>
      buildDailyCountryData(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[countryRevenueRange],
        "revenue_usd",
      ),
    [purchases, countryRevenueRange],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <ChartTimeRangeSelectTwelveMonth
              value={purchasesChartTimeRange}
              onChange={setPurchasesChartTimeRange}
            />
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
            <ChartTimeRangeSelectTwelveMonth value={countryCountRange} onChange={setCountryCountRange} />
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
                  interval={adminChartXAxisIntervalForDays(
                    ADMIN_TWELVE_MONTH_CHART_DAYS[countryCountRange],
                  )}
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
              <CardTitle>Daily EUR revenue by country</CardTitle>
              <CardDescription>
                EUR charges only (minor units), top {TOP_N_COUNTRIES} countries (paid only)
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={countryRevenueRange}
              onChange={setCountryRevenueRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {countryRevenueEurList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No EUR revenue in this range, or no country data yet.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <LineChart data={countryRevenueEurData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={adminChartXAxisIntervalForDays(
                    ADMIN_TWELVE_MONTH_CHART_DAYS[countryRevenueRange],
                  )}
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
                {countryRevenueEurList.map((country, i) => (
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
              <CardTitle>Daily USD revenue by country</CardTitle>
              <CardDescription>
                USD charges only (minor units), top {TOP_N_COUNTRIES} countries (paid only)
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={countryRevenueRange}
              onChange={setCountryRevenueRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {countryRevenueUsdList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No USD revenue in this range, or no country data yet.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <LineChart data={countryRevenueUsdData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={adminChartXAxisIntervalForDays(
                    ADMIN_TWELVE_MONTH_CHART_DAYS[countryRevenueRange],
                  )}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `$${(value / 100).toFixed(2)}`,
                    name,
                  ]}
                />
                <Legend />
                {countryRevenueUsdList.map((country, i) => (
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
          <CardTitle>Purchases by Mode</CardTitle>
          <CardDescription>
            Normal vs Cruel mode (paid items only, excludes bundle components)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold">
                {purchases.filter((p) => p.price_paid > 0 && !p.bundle_id && p.cruel_mode === false).length}
              </p>
              <p className="text-sm text-muted-foreground">Normal Mode</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {purchases.filter((p) => p.price_paid > 0 && !p.bundle_id && p.cruel_mode === true).length}
              </p>
              <p className="text-sm text-muted-foreground">Cruel Mode</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {purchases.filter((p) => p.price_paid > 0 && !p.bundle_id && (p.cruel_mode === null || p.cruel_mode === undefined)).length}
              </p>
              <p className="text-sm text-muted-foreground">Unknown (legacy)</p>
            </div>
          </div>
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
                      {purchase.cruel_mode === true && (
                        <span className="ml-2 text-red-600">Cruel</span>
                      )}
                      {purchase.cruel_mode === false && (
                        <span className="ml-2 text-muted-foreground">Normal</span>
                      )}
                    </p>
                  </div>
                  <p className="font-bold">
                    {formatPurchaseMinorUnits(
                      purchase.price_paid,
                      purchase.currency,
                    )}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
