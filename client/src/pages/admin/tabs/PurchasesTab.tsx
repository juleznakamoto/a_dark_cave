import {
  ADMIN_HISTORICAL_USD_PER_EUR,
  adminUnifiedRevenueEurCents,
  formatAdminUnifiedRevenueEur,
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

const TOP_N_COUNTRIES = 10;
const TOP_N_PAYMENT_TYPES = 10;

const SERIES_COLORS = COUNTRY_COLORS;

interface PurchasesTabProps {
  purchases: any[];
  gameSaves: any[];
  getTotalRevenueEurUnifiedCents: () => number;
  getDailyPurchases: () => Array<{ day: string; purchases: number }>;
  purchasesChartTimeRange: AdminTwelveMonthChartRange;
  setPurchasesChartTimeRange: (range: AdminTwelveMonthChartRange) => void;
}

type CountryChartMode = "count" | "revenue_unified_eur";

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Readable legend label for stored ISO country codes. */
function countryChartLabel(stored: string): string {
  if (stored === "Unknown") return "Unknown";
  try {
    return countryDisplayNames.of(stored.toUpperCase()) ?? stored;
  } catch {
    return stored;
  }
}

/** Readable legend label for stored payment_type keys. */
function paymentTypeChartLabel(stored: string): string {
  if (stored === "Unknown") return "Unknown";
  if (stored.startsWith("card:")) {
    const brand = stored.slice(5);
    return brand ? `Card (${brand})` : "Card";
  }
  return stored.charAt(0).toUpperCase() + stored.slice(1).replace(/_/g, " ");
}

function countryContribution(p: any, mode: CountryChartMode): number {
  if (mode === "count") return 1;
  return adminUnifiedRevenueEurCents(p);
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

type PaymentTypeChartMode = "count" | "revenue_unified_eur";

function paymentTypeContribution(p: any, mode: PaymentTypeChartMode): number {
  if (mode === "count") return 1;
  return adminUnifiedRevenueEurCents(p);
}

function buildDailyPaymentTypeData(
  purchases: any[],
  days: number,
  mode: PaymentTypeChartMode,
) {
  const now = new Date();
  const start = startOfDay(subDays(now, days - 1));

  const relevant = purchases.filter((p) => {
    if (p.price_paid <= 0 || p.bundle_id) return false;
    return parseISO(p.purchased_at) >= start;
  });

  const totals = new Map<string, number>();
  relevant.forEach((p) => {
    const add = paymentTypeContribution(p, mode);
    if (mode !== "count" && add <= 0) return;
    const key = p.payment_type && String(p.payment_type).trim() !== ""
      ? String(p.payment_type)
      : "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + add);
  });

  const topTypes = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N_PAYMENT_TYPES)
    .map(([k]) => k);

  const rows: Record<string, any>[] = Array.from({ length: days }, (_, i) => {
    const row: Record<string, any> = {
      day: format(addDays(start, i), days > 90 ? "MMM d" : "MMM d"),
    };
    topTypes.forEach((k) => (row[k] = 0));
    return row;
  });

  relevant.forEach((p) => {
    const key = p.payment_type && String(p.payment_type).trim() !== ""
      ? String(p.payment_type)
      : "Unknown";
    if (!topTypes.includes(key)) return;
    const add = paymentTypeContribution(p, mode);
    if (mode !== "count" && add <= 0) return;
    const d = startOfDay(parseISO(p.purchased_at));
    const idx = Math.round((d.getTime() - start.getTime()) / 86400000);
    if (idx >= 0 && idx < rows.length) {
      rows[idx][key] = (rows[idx][key] ?? 0) + add;
    }
  });

  return { data: rows, paymentTypes: topTypes };
}

function buildPurchasesByPlaytime(
  purchases: any[],
  gameSaves: any[],
  days: number,
): Array<{ playtime: string; purchases: number }> {
  const now = new Date();
  const start = startOfDay(subDays(now, days - 1));

  const playtimeBuckets: Record<string, number> = {};
  for (let i = 0; i < 24; i++) {
    playtimeBuckets[`${i}h`] = 0;
  }

  purchases
    .filter((p) => {
      if (p.price_paid <= 0 || p.bundle_id) return false;
      return parseISO(p.purchased_at) >= start;
    })
    .forEach((purchase) => {
      const save = gameSaves.find((s) => s.user_id === purchase.user_id);
      if (save) {
        const playTimeMinutes = save.game_state?.playTime
          ? Math.round(save.game_state.playTime / 60000)
          : 0;
        const bucket = Math.floor(playTimeMinutes / 60);

        if (bucket >= 0 && bucket < 24) {
          playtimeBuckets[`${bucket}h`]++;
        }
      }
    });

  return Object.entries(playtimeBuckets)
    .map(([playtime, purchases]) => ({ playtime, purchases }))
    .sort((a, b) => parseInt(a.playtime) - parseInt(b.playtime));
}

function buildPurchaseStats(
  purchases: any[],
  days: number,
): Array<{ name: string; count: number }> {
  const now = new Date();
  const start = startOfDay(subDays(now, days - 1));
  const itemCounts = new Map<string, number>();

  purchases
    .filter((p) => !p.bundle_id && parseISO(p.purchased_at) >= start)
    .forEach((purchase) => {
      itemCounts.set(
        purchase.item_name,
        (itemCounts.get(purchase.item_name) || 0) + 1,
      );
    });

  return Array.from(itemCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function PurchasesTab(props: PurchasesTabProps) {
  const {
    purchases,
    gameSaves,
    getTotalRevenueEurUnifiedCents,
    getDailyPurchases,
    purchasesChartTimeRange,
    setPurchasesChartTimeRange,
  } = props;

  const [countryCountRange, setCountryCountRange] = useState<AdminTwelveMonthChartRange>("1m");
  const [countryRevenueRange, setCountryRevenueRange] = useState<AdminTwelveMonthChartRange>("1m");
  const [paymentTypeCountRange, setPaymentTypeCountRange] =
    useState<AdminTwelveMonthChartRange>("1m");
  const [paymentTypeRevenueRange, setPaymentTypeRevenueRange] =
    useState<AdminTwelveMonthChartRange>("1m");
  const [playtimeChartRange, setPlaytimeChartRange] =
    useState<AdminTwelveMonthChartRange>("1m");
  const [itemChartRange, setItemChartRange] =
    useState<AdminTwelveMonthChartRange>("1m");

  const { data: countryCountData, countries: countryCountList } = useMemo(
    () =>
      buildDailyCountryData(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[countryCountRange],
        "count",
      ),
    [purchases, countryCountRange],
  );

  const { data: countryRevenueUnifiedData, countries: countryRevenueUnifiedList } =
    useMemo(
      () =>
        buildDailyCountryData(
          purchases,
          ADMIN_TWELVE_MONTH_CHART_DAYS[countryRevenueRange],
          "revenue_unified_eur",
        ),
      [purchases, countryRevenueRange],
    );

  const { data: paymentTypeCountData, paymentTypes: paymentTypeCountList } = useMemo(
    () =>
      buildDailyPaymentTypeData(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[paymentTypeCountRange],
        "count",
      ),
    [purchases, paymentTypeCountRange],
  );

  const {
    data: paymentTypeRevenueUnifiedData,
    paymentTypes: paymentTypeRevenueUnifiedList,
  } = useMemo(
    () =>
      buildDailyPaymentTypeData(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[paymentTypeRevenueRange],
        "revenue_unified_eur",
      ),
    [purchases, paymentTypeRevenueRange],
  );

  const purchasesByPlaytimeData = useMemo(
    () =>
      buildPurchasesByPlaytime(
        purchases,
        gameSaves,
        ADMIN_TWELVE_MONTH_CHART_DAYS[playtimeChartRange],
      ),
    [purchases, gameSaves, playtimeChartRange],
  );

  const purchaseStatsData = useMemo(
    () =>
      buildPurchaseStats(
        purchases,
        ADMIN_TWELVE_MONTH_CHART_DAYS[itemChartRange],
      ),
    [purchases, itemChartRange],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>
              All-time paid total in EUR (Stripe FX when stored; else USD at{" "}
              {ADMIN_HISTORICAL_USD_PER_EUR} USD/EUR)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold">
              €{(getTotalRevenueEurUnifiedCents() / 100).toFixed(2)}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Daily Sales by Country</CardTitle>
              <CardDescription>
                Stacked bars: daily counts by country (top {TOP_N_COUNTRIES}, paid only); segment height shows share of each day&apos;s total
              </CardDescription>
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
              <BarChart data={countryCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={adminChartXAxisIntervalForDays(
                    ADMIN_TWELVE_MONTH_CHART_DAYS[countryCountRange],
                  )}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    countryChartLabel(name),
                  ]}
                />
                <Legend formatter={(value) => countryChartLabel(String(value))} />
                {countryCountList.map((country, i) => (
                  <Bar
                    key={country}
                    dataKey={country}
                    stackId="countryCount"
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Daily revenue by country (EUR)</CardTitle>
              <CardDescription>
                Stacked bars: unified EUR per day by country (Stripe FX or {ADMIN_HISTORICAL_USD_PER_EUR}{" "}
                USD/EUR), top {TOP_N_COUNTRIES} countries (paid only)
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={countryRevenueRange}
              onChange={setCountryRevenueRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {countryRevenueUnifiedList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No paid revenue in this range, or no country data yet.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <BarChart data={countryRevenueUnifiedData}>
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
                    countryChartLabel(name),
                  ]}
                />
                <Legend formatter={(value) => countryChartLabel(String(value))} />
                {countryRevenueUnifiedList.map((country, i) => (
                  <Bar
                    key={country}
                    dataKey={country}
                    stackId="countryRevenue"
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Daily purchases by payment type</CardTitle>
              <CardDescription>
                Stacked bars: daily purchase counts by Stripe payment method (paid only); top{" "}
                {TOP_N_PAYMENT_TYPES} types. Legacy rows without stored type count as Unknown.
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={paymentTypeCountRange}
              onChange={setPaymentTypeCountRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {paymentTypeCountList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No paid purchases in this range.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <BarChart data={paymentTypeCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={adminChartXAxisIntervalForDays(
                    ADMIN_TWELVE_MONTH_CHART_DAYS[paymentTypeCountRange],
                  )}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => label}
                  formatter={(value: number, name: string) => [
                    value,
                    paymentTypeChartLabel(name),
                  ]}
                />
                <Legend formatter={(value) => paymentTypeChartLabel(String(value))} />
                {paymentTypeCountList.map((pt, i) => (
                  <Bar
                    key={pt}
                    dataKey={pt}
                    stackId="paymentTypeCount"
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Daily revenue by payment type (EUR)</CardTitle>
              <CardDescription>
                Stacked bars: unified EUR per day by payment method; top {TOP_N_PAYMENT_TYPES} types (paid only)
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={paymentTypeRevenueRange}
              onChange={setPaymentTypeRevenueRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {paymentTypeRevenueUnifiedList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No paid revenue in this range.
            </p>
          ) : (
            <ChartContainer config={{}} className="h-[400px] w-full">
              <BarChart data={paymentTypeRevenueUnifiedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  interval={adminChartXAxisIntervalForDays(
                    ADMIN_TWELVE_MONTH_CHART_DAYS[paymentTypeRevenueRange],
                  )}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickFormatter={(v) => `€${(v / 100).toFixed(0)}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `€${(value / 100).toFixed(2)}`,
                    paymentTypeChartLabel(name),
                  ]}
                />
                <Legend formatter={(value) => paymentTypeChartLabel(String(value))} />
                {paymentTypeRevenueUnifiedList.map((pt, i) => (
                  <Bar
                    key={pt}
                    dataKey={pt}
                    stackId="paymentTypeRevenue"
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Purchases by Playtime</CardTitle>
              <CardDescription>
                When do players make purchases? (hourly intervals, excluding free items)
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={playtimeChartRange}
              onChange={setPlaytimeChartRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <LineChart data={purchasesByPlaytimeData}>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Purchases by Item</CardTitle>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={itemChartRange}
              onChange={setItemChartRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <BarChart data={purchaseStatsData}>
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
                    {formatAdminUnifiedRevenueEur(purchase)}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
