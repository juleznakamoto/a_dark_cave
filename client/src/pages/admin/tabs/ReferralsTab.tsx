import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ADMIN_TWELVE_MONTH_CHART_DAYS,
  adminChartXAxisIntervalForDays,
  ChartTimeRangeSelectTwelveMonth,
  type AdminTwelveMonthChartRange,
} from "../adminChartTimeRange";

interface ReferralsTabProps {
  getTotalReferrals: () => number;
  gameSaves: any[];
  getDailyReferrals: () => Array<{ day: string; referrals: number }>;
  getTopReferrers: () => Array<{ userId: string; count: number }>;
  referralsChartTimeRange: AdminTwelveMonthChartRange;
  setReferralsChartTimeRange: (range: AdminTwelveMonthChartRange) => void;
}

export default function ReferralsTab(props: ReferralsTabProps) {
  const {
    getTotalReferrals,
    gameSaves,
    getDailyReferrals,
    getTopReferrers,
    referralsChartTimeRange,
    setReferralsChartTimeRange,
  } = props;

  const referralsChartDays = ADMIN_TWELVE_MONTH_CHART_DAYS[referralsChartTimeRange];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Referrals</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getTotalReferrals()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users with Referrals</CardTitle>
            <CardDescription>Players who referred others</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {gameSaves.filter((s) => (s.game_state?.referrals || []).length > 0).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Referrals per User</CardTitle>
            <CardDescription>Among users with referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {gameSaves.filter((s) => (s.game_state?.referrals || []).length > 0).length > 0
                ? (
                    getTotalReferrals() /
                    gameSaves.filter((s) => (s.game_state?.referrals || []).length > 0).length
                  ).toFixed(1)
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Daily Referrals</CardTitle>
              <CardDescription>New referrals over time</CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={referralsChartTimeRange}
              onChange={setReferralsChartTimeRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <AreaChart data={getDailyReferrals()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                interval={adminChartXAxisIntervalForDays(referralsChartDays)}
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="referrals" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Referrers</CardTitle>
          <CardDescription>Users who referred the most players</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <BarChart data={getTopReferrers()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="userId" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
