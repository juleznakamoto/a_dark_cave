
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SleepTabProps {
  showCompletedOnly: boolean;
  setShowCompletedOnly: (value: boolean) => void;
  gameSaves: any[];
  selectedUser: string;
  getSleepUpgradesDistribution: () => Array<{ level: string; lengthUsers: number; intensityUsers: number }>;
}

export default function SleepTab(props: SleepTabProps) {
  const {
    showCompletedOnly,
    setShowCompletedOnly,
    gameSaves,
    selectedUser,
    getSleepUpgradesDistribution,
  } = props;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompletedOnly}
            onChange={(e) => setShowCompletedOnly(e.target.checked)}
            className="cursor-pointer w-4 h-4"
          />
          <span className="text-sm font-medium">
            Show only players who completed the game (
            {
              gameSaves.filter(
                (save) =>
                  save.game_state?.events?.cube15a ||
                  save.game_state?.events?.cube15b ||
                  save.game_state?.events?.cube13 ||
                  save.game_state?.events?.cube14a ||
                  save.game_state?.events?.cube14b ||
                  save.game_state?.events?.cube14c ||
                  save.game_state?.events?.cube14d,
              ).length
            }{" "}
            players)
          </span>
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sleep Upgrade Levels Distribution</CardTitle>
          <CardDescription>
            Number of users at each SLEEP_LENGTH_UPGRADES and SLEEP_INTENSITY_UPGRADES level{" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getSleepUpgradesDistribution()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="level"
                label={{
                  value: "Upgrade Level",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Number of Users",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="lengthUsers"
                fill="#8884d8"
                name="Sleep Length Users"
              />
              <Bar
                dataKey="intensityUsers"
                fill="#82ca9d"
                name="Sleep Intensity Users"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Average Sleep Length Level</CardTitle>
            <CardDescription>All players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-center py-8">
              {gameSaves.length > 0
                ? (
                    gameSaves.reduce(
                      (sum, save) =>
                        sum +
                        (save.game_state?.sleepUpgrades?.lengthLevel || 0),
                      0,
                    ) / gameSaves.length
                  ).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Sleep Intensity Level</CardTitle>
            <CardDescription>All players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-center py-8">
              {gameSaves.length > 0
                ? (
                    gameSaves.reduce(
                      (sum, save) =>
                        sum +
                        (save.game_state?.sleepUpgrades?.intensityLevel || 0),
                      0,
                    ) / gameSaves.length
                  ).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
