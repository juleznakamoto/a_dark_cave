
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface CompletionTabProps {
  gameSaves: any[];
  getGameCompletionStats: () => Array<{ name: string; value: number }>;
  COLORS: string[];
}

export default function CompletionTab(props: CompletionTabProps) {
  const { gameSaves, getGameCompletionStats, COLORS } = props;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{gameSaves.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed Game</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {
                gameSaves.filter(
                  (s) =>
                    s.game_state?.events?.cube15a ||
                    s.game_state?.events?.cube15b ||
                    s.game_state?.events?.cube13 ||
                    s.game_state?.events?.cube14a ||
                    s.game_state?.events?.cube14b ||
                    s.game_state?.events?.cube14c ||
                    s.game_state?.events?.cube14d,
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Game Completion Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getGameCompletionStats()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getGameCompletionStats().map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
