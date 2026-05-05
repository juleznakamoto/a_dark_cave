import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ADMIN_TWELVE_MONTH_CHART_DAYS,
  adminChartXAxisIntervalForDays,
  ChartTimeRangeSelectTwelveMonth,
  type AdminTwelveMonthChartRange,
} from "../adminChartTimeRange";

interface ReferralsTabProps {
  totalReferrals: number;
  getDailyReferrals: () => Array<{ day: string; referrals: number }>;
  referralsChartTimeRange: AdminTwelveMonthChartRange;
  setReferralsChartTimeRange: (range: AdminTwelveMonthChartRange) => void;
}

export default function ReferralsTab(props: ReferralsTabProps) {
  const {
    totalReferrals,
    getDailyReferrals,
    referralsChartTimeRange,
    setReferralsChartTimeRange,
  } = props;

  const referralsChartDays = ADMIN_TWELVE_MONTH_CHART_DAYS[referralsChartTimeRange];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Referrals</CardTitle>
          <CardDescription>All time (from daily aggregates)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalReferrals}</p>
        </CardContent>
      </Card>

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
    </div>
  );
}
