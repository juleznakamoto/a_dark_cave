import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";

interface OverviewTabProps {
  getDailyActiveUsers: () => number;
  getWeeklyActiveUsers: () => number;
  getMonthlyActiveUsers: () => number;
  totalUserCount: number;
  gameSaves: any[];
  emailConfirmationStats: any;
  registrationMethodStats: any;
  formatTime: (minutes: number) => string;
  getAveragePlaytime: () => number;
  getAveragePlaytimeToCompletion: () => number;
  getConversionRate: () => number;
  getBuyersPerHundred: () => string;
  getARPU: () => string;
  getTotalRevenue: () => number;
  getInstagramFollowers: () => number;
  getInstagramFollowRate: () => string;
  getUserRetention: () => Array<{ day: string; users: number }>;
  getDailySignups: () => Array<{ day: string; signups: number }>;
  getHourlySignups: () => Array<{ hour: string; signups: number }>;
  dailyActiveUsersData: Array<{ date: string; active_user_count: number }>;
  chartTimeRange: "1m" | "3m" | "6m" | "1y";
  setChartTimeRange: (range: "1m" | "3m" | "6m" | "1y") => void;
}

export default function OverviewTab(props: OverviewTabProps) {
  const {
    getDailyActiveUsers,
    getWeeklyActiveUsers,
    getMonthlyActiveUsers,
    totalUserCount,
    gameSaves,
    emailConfirmationStats,
    registrationMethodStats,
    formatTime,
    getAveragePlaytime,
    getAveragePlaytimeToCompletion,
    getConversionRate,
    getBuyersPerHundred,
    getARPU,
    getTotalRevenue,
    getInstagramFollowers,
    getInstagramFollowRate,
    getUserRetention,
    getDailySignups,
    getHourlySignups,
    dailyActiveUsersData,
    chartTimeRange,
    setChartTimeRange
  } = props;

  // Filter and format DAU data based on chartTimeRange
  const getFormattedDailyActiveUsers = () => {
    const now = new Date();
    let days: number;
    switch (chartTimeRange) {
      case "1m":
        days = 30;
        break;
      case "3m":
        days = 90;
        break;
      case "6m":
        days = 180;
        break;
      case "1y":
        days = 365;
        break;
      default:
        days = 30;
    }

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filtered = (dailyActiveUsersData || [])
      .filter(d => {
        const date = parseISO(d.date);
        return date >= cutoffDate;
      })
      .slice()
      .reverse()
      .map(d => ({
        date: format(parseISO(d.date), days > 90 ? "MMM dd" : "MMM dd"),
        users: d.active_user_count,
      }));

    return filtered;
  };

  const formattedDailyActiveUsers = getFormattedDailyActiveUsers();

  const getTimeRangeLabel = () => {
    switch (chartTimeRange) {
      case "1m":
        return "Last 30 Days";
      case "3m":
        return "Last 3 Months";
      case "6m":
        return "Last 6 Months";
      case "1y":
        return "Last Year";
      default:
        return "Last 30 Days";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>DAU</CardTitle>
            <CardDescription>Daily Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getDailyActiveUsers()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WAU</CardTitle>
            <CardDescription>Weekly Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getWeeklyActiveUsers()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MAU</CardTitle>
            <CardDescription>Monthly Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getMonthlyActiveUsers()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>All registered players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalUserCount}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {gameSaves.length} active in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Methods</CardTitle>
          <CardDescription>How users are registering for the game</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email Registrations</p>
              <p className="text-3xl font-bold">{registrationMethodStats?.emailRegistrations || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(registrationMethodStats?.emailRegistrations + registrationMethodStats?.googleRegistrations) > 0
                  ? Math.round((registrationMethodStats.emailRegistrations / (registrationMethodStats.emailRegistrations + registrationMethodStats.googleRegistrations)) * 100)
                  : 0}% of registered users
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Google OAuth</p>
              <p className="text-3xl font-bold">{registrationMethodStats?.googleRegistrations || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(registrationMethodStats?.emailRegistrations + registrationMethodStats?.googleRegistrations) > 0
                  ? Math.round((registrationMethodStats.googleRegistrations / (registrationMethodStats.emailRegistrations + registrationMethodStats.googleRegistrations)) * 100)
                  : 0}% of registered users
              </p>
            </div>

            <div>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Email', value: registrationMethodStats?.emailRegistrations || 0 },
                      { name: 'Google', value: registrationMethodStats?.googleRegistrations || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    <Cell fill="#8884d8" />
                    <Cell fill="#82ca9d" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Confirmation Rate</CardTitle>
            <CardDescription>% who clicked verification link</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-4xl font-bold">
                  {emailConfirmationStats?.allTime?.totalRegistrations > 0
                    ? Math.round((emailConfirmationStats.allTime.confirmedUsers / emailConfirmationStats.allTime.totalRegistrations) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  All-time: {emailConfirmationStats?.allTime?.confirmedUsers || 0} / {emailConfirmationStats?.allTime?.totalRegistrations || 0}
                </p>
              </div>
              <div className="text-sm border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">30 days:</span>
                  <span className="font-semibold">
                    {emailConfirmationStats?.last30Days?.totalRegistrations > 0
                      ? Math.round((emailConfirmationStats.last30Days.confirmedUsers / emailConfirmationStats.last30Days.totalRegistrations) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7 days:</span>
                  <span className="font-semibold">
                    {emailConfirmationStats?.last7Days?.totalRegistrations > 0
                      ? Math.round((emailConfirmationStats.last7Days.confirmedUsers / emailConfirmationStats.last7Days.totalRegistrations) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unconfirmed Users</CardTitle>
            <CardDescription>Registered but not verified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-4xl font-bold">
                  {emailConfirmationStats?.allTime?.unconfirmedUsers || 0}
                </p>
                <p className="text-xs text-muted-foreground">All-time</p>
              </div>
              <div className="text-sm border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">30 days:</span>
                  <span className="font-semibold">{emailConfirmationStats?.last30Days?.unconfirmedUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7 days:</span>
                  <span className="font-semibold">{emailConfirmationStats?.last7Days?.unconfirmedUsers || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Confirmation Time</CardTitle>
            <CardDescription>Time to first sign-in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-4xl font-bold">
                  {emailConfirmationStats?.allTime?.usersWithSignIn > 0
                    ? formatTime(Math.round(emailConfirmationStats.allTime.totalConfirmationDelay / emailConfirmationStats.allTime.usersWithSignIn))
                    : '0m'}
                </p>
                <p className="text-xs text-muted-foreground">
                  All-time: {emailConfirmationStats?.allTime?.usersWithSignIn || 0} users
                </p>
              </div>
              <div className="text-sm border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">30 days:</span>
                  <span className="font-semibold">
                    {emailConfirmationStats?.last30Days?.usersWithSignIn > 0
                      ? formatTime(Math.round(emailConfirmationStats.last30Days.totalConfirmationDelay / emailConfirmationStats.last30Days.usersWithSignIn))
                      : '0m'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7 days:</span>
                  <span className="font-semibold">
                    {emailConfirmationStats?.last7Days?.usersWithSignIn > 0
                      ? formatTime(Math.round(emailConfirmationStats.last7Days.totalConfirmationDelay / emailConfirmationStats.last7Days.usersWithSignIn))
                      : '0m'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign-in Rate</CardTitle>
            <CardDescription>Confirmed users who signed in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-4xl font-bold">
                  {emailConfirmationStats?.allTime?.confirmedUsers > 0
                    ? Math.round((emailConfirmationStats.allTime.usersWithSignIn / emailConfirmationStats.allTime.confirmedUsers) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  All-time: {emailConfirmationStats?.allTime?.usersWithSignIn || 0} / {emailConfirmationStats?.allTime?.confirmedUsers || 0}
                </p>
              </div>
              <div className="text-sm border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">30 days:</span>
                  <span className="font-semibold">
                    {emailConfirmationStats?.last30Days?.confirmedUsers > 0
                      ? Math.round((emailConfirmationStats.last30Days.usersWithSignIn / emailConfirmationStats.last30Days.confirmedUsers) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7 days:</span>
                  <span className="font-semibold">
                    {emailConfirmationStats?.last7Days?.confirmedUsers > 0
                      ? Math.round((emailConfirmationStats.last7Days.usersWithSignIn / emailConfirmationStats.last7Days.confirmedUsers) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Avg Playtime</CardTitle>
            <CardDescription>All players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatTime(getAveragePlaytime())}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Time to Complete</CardTitle>
            <CardDescription>Completed games only</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatTime(getAveragePlaytimeToCompletion())}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>% of players who finished</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {gameSaves.length > 0
                ? Math.round(
                  (gameSaves.filter(
                    (s) =>
                      s.game_state?.events?.cube15a ||
                      s.game_state?.events?.cube15b ||
                      s.game_state?.events?.cube13 ||
                      s.game_state?.events?.cube14a ||
                      s.game_state?.events?.cube14b ||
                      s.game_state?.events?.cube14c ||
                      s.game_state?.events?.cube14d,
                  ).length /
                    gameSaves.length) *
                  100,
                )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>% who made a purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getConversionRate()}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyers per 100</CardTitle>
            <CardDescription>Non-free purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{getBuyersPerHundred()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ARPU</CardTitle>
            <CardDescription>Average Revenue Per User</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">€{getARPU()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">€{(getTotalRevenue() / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instagram Link Clicks</CardTitle>
          <CardDescription>Users who clicked the Instagram link</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-bold">{getInstagramFollowers()}</p>
              <p className="text-2xl text-muted-foreground">clicks</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Click Rate: <span className="font-semibold text-foreground">{getInstagramFollowRate()}%</span> of total users
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Active Users ({getTimeRangeLabel()})</CardTitle>
                <CardDescription>User activity over time</CardDescription>
              </div>
              <Select value={chartTimeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y") => setChartTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={formattedDailyActiveUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Sign-ups ({getTimeRangeLabel()})</CardTitle>
                <CardDescription>New user registrations</CardDescription>
              </div>
              <Select value={chartTimeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y") => setChartTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={getDailySignups()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="signups" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hourly Sign-ups (Last 24 Hours)</CardTitle>
          <CardDescription>New user registrations by hour</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <LineChart data={getHourlySignups()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="signups" stroke="#ffc658" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}