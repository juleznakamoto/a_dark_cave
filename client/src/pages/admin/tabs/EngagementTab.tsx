import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ADMIN_TWELVE_MONTH_CHART_DAYS,
  adminChartXAxisIntervalForDays,
  ChartTimeRangeSelectTwelveMonth,
  type AdminTwelveMonthChartRange,
} from "../adminChartTimeRange";
import {
  hasReachedGameEnding,
  type AdminGameSaveRow,
  type DailyCompletionsVsPlayersPoint,
} from "@shared/gameCompletionAdminStats";

interface EngagementTabProps {
  getSessionLengthDistribution: () => Array<{ range: string; count: number }>;
  getAveragePlaytime: () => number;
  getAveragePlaytimeToCompletion: () => number;
  formatTime: (minutes: number) => string;
  gameSaves: AdminGameSaveRow[];
  totalUserCount: number;
  gameCompletionStats: Array<{ name: string; value: number }>;
  getDailyCompletions: () => Array<{ day: string; completions: number }>;
  getDailyCompletionsVsPlayers: () => DailyCompletionsVsPlayersPoint[];
  completionsChartTimeRange: AdminTwelveMonthChartRange;
  setCompletionsChartTimeRange: (range: AdminTwelveMonthChartRange) => void;
  COLORS: string[];
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
    getDailyCompletions,
    getDailyCompletionsVsPlayers,
    completionsChartTimeRange,
    setCompletionsChartTimeRange,
    COLORS,
  } = props;

  const sessionLengthDistribution = getSessionLengthDistribution();
  const endingCount = gameSaves.filter((save) =>
    hasReachedGameEnding(save.game_state),
  ).length;
  const completionsChartDays =
    ADMIN_TWELVE_MONTH_CHART_DAYS[completionsChartTimeRange];
  const dailyCompletions = getDailyCompletions();
  const dailyCompletionsVsPlayers = getDailyCompletionsVsPlayers();
  const hasCompletionDistribution = gameCompletionStats.some(
    (entry) => entry.value > 0,
  );

  const pieChartConfig = {
    Completed: { label: "Completed", color: COLORS[0] },
    "Not Completed": { label: "Not Completed", color: COLORS[1] },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle>Daily Game Completions</CardTitle>
              <CardDescription>
                Completions recorded in game stats (one per finished run)
              </CardDescription>
            </div>
            <ChartTimeRangeSelectTwelveMonth
              value={completionsChartTimeRange}
              onChange={setCompletionsChartTimeRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              completions: {
                label: "Completions",
                color: "#8884d8",
              },
            }}
            className="h-[400px] w-full"
          >
            <AreaChart data={dailyCompletions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                interval={adminChartXAxisIntervalForDays(completionsChartDays)}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="completions"
                stroke="#8884d8"
                fill="#8884d8"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completions vs Players</CardTitle>
          <CardDescription>
            Daily game completions compared to daily active players (DAU). Uses the same time range as the chart above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              players: {
                label: "Players (DAU)",
                color: "#82ca9d",
              },
              completions: {
                label: "Completions",
                color: "#8884d8",
              },
            }}
            className="h-[400px] w-full"
          >
            <ComposedChart data={dailyCompletionsVsPlayers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                interval={adminChartXAxisIntervalForDays(completionsChartDays)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="players"
                allowDecimals={false}
                label={{
                  value: "Players",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fontSize: 11 },
                }}
              />
              <YAxis
                yAxisId="completions"
                orientation="right"
                allowDecimals={false}
                label={{
                  value: "Completions",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle", fontSize: 11 },
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar
                yAxisId="players"
                dataKey="players"
                fill="#82ca9d"
                name="Players (DAU)"
              />
              <Line
                yAxisId="completions"
                type="monotone"
                dataKey="completions"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                name="Completions"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Length Distribution</CardTitle>
          <CardDescription>
            How long players engage with the game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: { label: "Players", color: "#8884d8" },
            }}
            className="h-[300px] w-full"
          >
            <BarChart data={sessionLengthDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis allowDecimals={false} />
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
          <CardDescription>Share of loaded saves that reached an ending</CardDescription>
        </CardHeader>
        <CardContent>
          {hasCompletionDistribution ? (
            <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={gameCompletionStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {gameCompletionStats.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-4">
              No save data to chart yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
