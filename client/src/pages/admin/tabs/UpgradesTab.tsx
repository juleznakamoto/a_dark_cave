import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface UpgradesTabProps {
  showCompletedOnly: boolean;
  setShowCompletedOnly: (value: boolean) => void;
  gameSaves: any[];
  selectedUser: string;
  selectedMiningTypes: Set<string>;
  setSelectedMiningTypes: (value: Set<string>) => void;
  buttonUpgradesOverPlaytime: Array<{ time: string; [key: string]: any }>;
  COLORS: string[];
}

export default function UpgradesTab(props: UpgradesTabProps) {
  const {
    showCompletedOnly,
    setShowCompletedOnly,
    gameSaves,
    selectedUser,
    selectedMiningTypes,
    setSelectedMiningTypes,
    buttonUpgradesOverPlaytime,
    COLORS,
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
          <CardTitle>Cave Exploring Upgrades Over Playtime</CardTitle>
          <CardDescription>
            Average upgrade level over time (1-hour intervals){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={buttonUpgradesOverPlaytime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
                interval={0}
              />
              <YAxis
                label={{
                  value: "Average Level",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[1, 10]}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="caveExplore"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Cave Exploring"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mining Upgrades Over Playtime</CardTitle>
          <CardDescription>
            Average upgrade level over time (1-hour intervals){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMiningTypes(new Set(["mineStone", "mineIron", "mineCoal", "mineSulfur", "mineObsidian", "mineAdamant"]))}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedMiningTypes(new Set())}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Deselect All
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              {[
                { key: "caveExplore", label: "Cave Exploring", color: "#8884d8" },
                { key: "mineStone", label: "Stone Mining", color: "#82ca9d" },
                { key: "mineIron", label: "Iron Mining", color: "#ffc658" },
                { key: "mineCoal", label: "Coal Mining", color: "#ff8042" },
                { key: "mineSulfur", label: "Sulfur Mining", color: "#0088FE" },
                { key: "mineObsidian", label: "Obsidian Mining", color: "#00C49F" },
                { key: "mineAdamant", label: "Adamant Mining", color: "#a0522d" },
                { key: "hunt", label: "Hunting", color: "#9b59b6" },
                { key: "chopWood", label: "Woodcutting", color: "#27ae60" },
              ].map((miningType) => (
                <label
                  key={miningType.key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMiningTypes.has(miningType.key)}
                    onChange={(e) => {
                      const newSet = new Set(selectedMiningTypes);
                      if (e.target.checked) {
                        newSet.add(miningType.key);
                      } else {
                        newSet.delete(miningType.key);
                      }
                      setSelectedMiningTypes(newSet);
                    }}
                    className="cursor-pointer"
                  />
                  <span
                    className="text-sm"
                    style={{ color: miningType.color }}
                  >
                    {miningType.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={buttonUpgradesOverPlaytime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
                interval={0}
              />
              <YAxis
                label={{
                  value: "Average Level",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[1, 10]}
              />
              <Tooltip />
              <Legend />
              {selectedMiningTypes.has("mineStone") && (
                <Line
                  type="monotone"
                  dataKey="mineStone"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Stone Mining"
                />
              )}
              {selectedMiningTypes.has("mineIron") && (
                <Line
                  type="monotone"
                  dataKey="mineIron"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Iron Mining"
                />
              )}
              {selectedMiningTypes.has("mineCoal") && (
                <Line
                  type="monotone"
                  dataKey="mineCoal"
                  stroke="#ffc658"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Coal Mining"
                />
              )}
              {selectedMiningTypes.has("mineSulfur") && (
                <Line
                  type="monotone"
                  dataKey="mineSulfur"
                  stroke="#ff8042"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Sulfur Mining"
                />
              )}
              {selectedMiningTypes.has("mineObsidian") && (
                <Line
                  type="monotone"
                  dataKey="mineObsidian"
                  stroke="#0088FE"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Obsidian Mining"
                />
              )}
              {selectedMiningTypes.has("mineAdamant") && (
                <Line
                  type="monotone"
                  dataKey="mineAdamant"
                  stroke="#00C49F"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Adamant Mining"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hunting Upgrades Over Playtime</CardTitle>
          <CardDescription>
            Average upgrade level over time (1-hour intervals){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={buttonUpgradesOverPlaytime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
                interval={0}
              />
              <YAxis
                label={{
                  value: "Average Level",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[1, 10]}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="hunt"
                stroke="#ffc658"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Hunting"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Woodcutting Upgrades Over Playtime</CardTitle>
          <CardDescription>
            Average upgrade level over time (1-hour intervals){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={buttonUpgradesOverPlaytime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
                interval={0}
              />
              <YAxis
                label={{
                  value: "Average Level",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[1, 10]}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="chopWood"
                stroke="#ff8042"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Woodcutting"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Button Upgrades Over Playtime (Combined)</CardTitle>
          <CardDescription>
            Average upgrade levels over time (1-hour intervals){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={buttonUpgradesOverPlaytime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
                interval={0}
              />
              <YAxis
                label={{
                  value: "Average Level",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[1, 10]}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="caveExplore"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Cave Exploring"
              />
              <Line
                type="monotone"
                dataKey="mineStone"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Stone Mining"
              />
              <Line
                type="monotone"
                dataKey="hunt"
                stroke="#ffc658"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Hunting"
              />
              <Line
                type="monotone"
                dataKey="chopWood"
                stroke="#ff8042"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Woodcutting"
              />
              <Line
                type="monotone"
                dataKey="caveExplore"
                stroke="#0088FE"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="General Cave Explore"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}