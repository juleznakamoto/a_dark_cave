
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ReferralsTabProps {
  getTotalReferrals: () => number;
  gameSaves: any[];
  getDailyReferrals: () => Array<{ day: string; referrals: number }>;
  getTopReferrers: () => Array<{ userId: string; count: number }>;
}

export default function ReferralsTab(props: ReferralsTabProps) {
  const { getTotalReferrals, gameSaves, getDailyReferrals, getTopReferrers } = props;

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
          <CardTitle>Daily Referrals (Last 30 Days)</CardTitle>
          <CardDescription>New referrals over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={getDailyReferrals()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="referrals" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Referrers</CardTitle>
          <CardDescription>Users who referred the most players</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getTopReferrers()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="userId" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
