
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ResourcesTabProps {
  showCompletedOnly: boolean;
  setShowCompletedOnly: (value: boolean) => void;
  gameSaves: any[];
  selectedUser: string;
  selectedStats: Set<string>;
  setSelectedStats: (value: Set<string>) => void;
  selectedResources: Set<string>;
  setSelectedResources: (value: Set<string>) => void;
  getStatsOverPlaytime: () => Array<{ time: string; [key: string]: any }>;
  getResourceStatsOverPlaytime: () => Array<{ time: string; [key: string]: any }>;
  COLORS: string[];
}

export default function ResourcesTab(props: ResourcesTabProps) {
  const {
    showCompletedOnly,
    setShowCompletedOnly,
    gameSaves,
    selectedStats,
    setSelectedStats,
    selectedResources,
    setSelectedResources,
    getStatsOverPlaytime,
    getResourceStatsOverPlaytime,
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
          <CardTitle>Average Stats Over Playtime</CardTitle>
          <CardDescription>
            Average stat values (Strength, Knowledge, Luck, Madness) in 1-hour playtime intervals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSelectedStats(
                    new Set(["strength", "knowledge", "luck", "madness"]),
                  )
                }
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedStats(new Set())}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Deselect All
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              {["strength", "knowledge", "luck", "madness"].map((stat) => (
                <label
                  key={stat}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStats.has(stat)}
                    onChange={(e) => {
                      const newSet = new Set(selectedStats);
                      if (e.target.checked) {
                        newSet.add(stat);
                      } else {
                        newSet.delete(stat);
                      }
                      setSelectedStats(newSet);
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm capitalize">{stat}</span>
                </label>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getStatsOverPlaytime()}>
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
                  value: "Average Value",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              {(() => {
                const chartData = getStatsOverPlaytime();
                if (chartData.length === 0) return null;

                const selectedStatsList = Array.from(selectedStats);

                return selectedStatsList.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                  />
                ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Resources Over Playtime</CardTitle>
          <CardDescription>
            Average amount of each resource in 1-hour playtime intervals. Filterable by completion status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSelectedResources(
                    new Set([
                      "food", "bones", "fur", "wood", "stone", "iron", "coal",
                      "sulfur", "obsidian", "adamant", "moonstone", "leather",
                      "steel", "torch", "black_powder", "ember_bomb",
                      "ashfire_dust", "ashfire_bomb", "void_bomb", "silver", "gold",
                    ]),
                  )
                }
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedResources(new Set())}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Deselect All
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              {[
                "food", "bones", "fur", "wood", "stone", "iron", "coal",
                "sulfur", "obsidian", "adamant", "moonstone", "leather",
                "steel", "torch", "black_powder", "ember_bomb",
                "ashfire_dust", "ashfire_bomb", "void_bomb", "silver", "gold",
              ].map((resource) => (
                <label
                  key={resource}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedResources.has(resource)}
                    onChange={(e) => {
                      const newSet = new Set(selectedResources);
                      if (e.target.checked) {
                        newSet.add(resource);
                      } else {
                        newSet.delete(resource);
                      }
                      setSelectedResources(newSet);
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">{resource}</span>
                </label>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getResourceStatsOverPlaytime()}>
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
                  value: "Average Amount",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              {(() => {
                const chartData = getResourceStatsOverPlaytime();
                if (chartData.length === 0) return null;

                const selectedResourcesList = Array.from(selectedResources);

                return selectedResourcesList.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
