
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface PurchasesTabProps {
  purchases: any[];
  getTotalRevenue: () => number;
  getDailyPurchases: () => Array<{ day: string; purchases: number }>;
  getPurchasesByPlaytime: () => Array<{ playtime: string; purchases: number }>;
  getPurchaseStats: () => Array<{ name: string; count: number }>;
  purchasesChartTimeRange: "1m" | "3m" | "6m" | "12m";
  setPurchasesChartTimeRange: (range: "1m" | "3m" | "6m" | "12m") => void;
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
            <Select
              value={purchasesChartTimeRange}
              onValueChange={(value: "1m" | "3m" | "6m" | "12m") => setPurchasesChartTimeRange(value)}
            >
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
