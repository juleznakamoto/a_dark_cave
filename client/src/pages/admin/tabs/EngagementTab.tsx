
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface EngagementTabProps {
  getSessionLengthDistribution: () => Array<{ range: string; count: number }>;
  formatTime: (minutes: number) => string;
  getAveragePlaytime: () => number;
  getAveragePlaytimeToCompletion: () => number;
}

export default function EngagementTab(props: EngagementTabProps) {
  const {
    getSessionLengthDistribution,
    formatTime,
    getAveragePlaytime,
    getAveragePlaytimeToCompletion,
  } = props;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Session Length Distribution</CardTitle>
          <CardDescription>How long players engage with the game</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getSessionLengthDistribution()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Average Playtime</CardTitle>
            <CardDescription>All players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold text-center py-8">
              {formatTime(getAveragePlaytime())}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Time to Complete</CardTitle>
            <CardDescription>Completed games only</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold text-center py-8">
              {formatTime(getAveragePlaytimeToCompletion())}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
