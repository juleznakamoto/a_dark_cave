import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface GameSaveRow {
  game_state?: {
    events?: Record<string, unknown>;
  };
}

interface EngagementTabProps {
  getSessionLengthDistribution: () => Array<{ range: string; count: number }>;
  getAveragePlaytime: () => number;
  getAveragePlaytimeToCompletion: () => number;
  formatTime: (minutes: number) => string;
  gameSaves: GameSaveRow[];
  totalUserCount: number;
  gameCompletionStats: Array<{ name: string; value: number }>;
  COLORS: string[];
}

function reachedEnding(save: GameSaveRow): boolean {
  const e = save.game_state?.events;
  return Boolean(
    e?.cube15a ||
    e?.cube15b ||
    e?.cube13 ||
    e?.cube14a ||
    e?.cube14b ||
    e?.cube14c ||
    e?.cube14d,
  );
}

export default function EngagementTab(props: EngagementTabProps) {
  const {
    getSessionLengthDistribution,
    getAveragePlaytime,
    getAveragePlaytimeToCompletion,
    formatTime,
    gameSaves,
    totalUserCount,
    gameCompletionStats,
    COLORS,
  } = props;

  const sessionLengthDistribution = getSessionLengthDistribution();
  const endingCount = gameSaves.filter(reachedEnding).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Session Length Distribution</CardTitle>
          <CardDescription>
            How long players engage with the game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <BarChart data={sessionLengthDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ChartContainer>
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

      <Card>
        <CardHeader>
          <CardTitle>Game Completion</CardTitle>
          <CardDescription>Players who reached an ending ({totalUserCount} total registered users)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{endingCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">
            {totalUserCount > 0
              ? Math.round((endingCount / totalUserCount) * 100)
              : 0}
            %
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Completion Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gameCompletionStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {gameCompletionStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
