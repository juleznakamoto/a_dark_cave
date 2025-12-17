
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface ClicksTabProps {
  showCompletedOnly: boolean;
  setShowCompletedOnly: (value: boolean) => void;
  gameSaves: any[];
  selectedUser: string;
  selectedClickTypes: Set<string>;
  setSelectedClickTypes: (value: Set<string>) => void;
  getAllButtonNames: () => string[];
  getButtonClicksOverTime: () => Array<{ time: string; clicks: number }>;
  getClickTypesByTimestamp: () => Array<{ time: string; [key: string]: any }>;
  getTotalClicksByButton: () => Array<{ button: string; total: number }>;
  getAverageClicksByButton: () => Array<{ button: string; average: number }>;
  COLORS: string[];
}

export default function ClicksTab(props: ClicksTabProps) {
  const {
    showCompletedOnly,
    setShowCompletedOnly,
    gameSaves,
    selectedUser,
    selectedClickTypes,
    setSelectedClickTypes,
    getAllButtonNames,
    getButtonClicksOverTime,
    getClickTypesByTimestamp,
    getTotalClicksByButton,
    getAverageClicksByButton,
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
          <CardTitle>Button Clicks Over Time</CardTitle>
          <CardDescription>
            Total button clicks in 15-minute intervals (time elapsed since first click){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getButtonClicksOverTime()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Clicks",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Click Types Over Playtime</CardTitle>
          <CardDescription>
            Click counts by type in 15-minute intervals (time elapsed since first click){" "}
            {selectedUser !== "all"
              ? "for selected user"
              : showCompletedOnly
                ? "for completed players only"
                : "across all users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  const allButtons = getAllButtonNames().filter(
                    (buttonName) => {
                      if (
                        selectedClickTypes.has("filter:cube") &&
                        buttonName.startsWith("cube-")
                      )
                        return false;
                      if (
                        selectedClickTypes.has("filter:merchant") &&
                        buttonName.startsWith("merchant-trade")
                      )
                        return false;
                      if (
                        selectedClickTypes.has("filter:assign") &&
                        (buttonName.startsWith("assign") ||
                          buttonName.startsWith("unassign"))
                      )
                        return false;
                      if (
                        selectedClickTypes.has("filter:choice") &&
                        (buttonName.includes("_choice_") ||
                          buttonName.includes("-choice-"))
                      )
                        return false;
                      return true;
                    },
                  );
                  setSelectedClickTypes(new Set(allButtons));
                }}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedClickTypes(new Set())}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Deselect All
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!selectedClickTypes.has("filter:cube")}
                  onChange={(e) => {
                    const newSet = new Set(selectedClickTypes);
                    if (!e.target.checked) {
                      newSet.add("filter:cube");
                    } else {
                      newSet.delete("filter:cube");
                    }
                    setSelectedClickTypes(newSet);
                  }}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-medium">Show Cube Events</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!selectedClickTypes.has("filter:merchant")}
                  onChange={(e) => {
                    const newSet = new Set(selectedClickTypes);
                    if (!e.target.checked) {
                      newSet.add("filter:merchant");
                    } else {
                      newSet.delete("filter:merchant");
                    }
                    setSelectedClickTypes(newSet);
                  }}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-medium">Show Merchant Trades</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!selectedClickTypes.has("filter:assign")}
                  onChange={(e) => {
                    const newSet = new Set(selectedClickTypes);
                    if (!e.target.checked) {
                      newSet.add("filter:assign");
                    } else {
                      newSet.delete("filter:assign");
                    }
                    setSelectedClickTypes(newSet);
                  }}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-medium">Show Assign/Unassign Events</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!selectedClickTypes.has("filter:choice")}
                  onChange={(e) => {
                    const newSet = new Set(selectedClickTypes);
                    if (!e.target.checked) {
                      newSet.add("filter:choice");
                    } else {
                      newSet.delete("filter:choice");
                    }
                    setSelectedClickTypes(newSet);
                  }}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-medium">Show Event Choices</span>
              </label>
            </div>
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            {getAllButtonNames()
              .filter((buttonName) => {
                if (
                  selectedClickTypes.has("filter:cube") &&
                  buttonName.startsWith("cube-")
                )
                  return false;
                if (
                  selectedClickTypes.has("filter:merchant") &&
                  buttonName.startsWith("merchant-trade")
                )
                  return false;
                if (
                  selectedClickTypes.has("filter:assign") &&
                  (buttonName.startsWith("assign") ||
                    buttonName.startsWith("unassign"))
                )
                  return false;
                if (
                  selectedClickTypes.has("filter:choice") &&
                  (buttonName.includes("_choice_") ||
                    buttonName.includes("-choice-"))
                )
                  return false;
                return true;
              })
              .map((buttonName) => (
                <label
                  key={buttonName}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedClickTypes.has(buttonName)}
                    onChange={(e) => {
                      const newSet = new Set(selectedClickTypes);
                      if (e.target.checked) {
                        newSet.add(buttonName);
                      } else {
                        newSet.delete(buttonName);
                      }
                      setSelectedClickTypes(newSet);
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">{buttonName}</span>
                </label>
              ))}
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getClickTypesByTimestamp()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: "Playtime",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Clicks",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              {(() => {
                const chartData = getClickTypesByTimestamp();
                const allKeys = new Set<string>();
                chartData.forEach((dataPoint) => {
                  Object.keys(dataPoint).forEach((key) => {
                    if (key !== "time") {
                      allKeys.add(key);
                    }
                  });
                });
                const dataKeys = Array.from(allKeys);
                return dataKeys.map((key, index) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Top Clicked Buttons</CardTitle>
          <CardDescription>Total clicks per button (top 15)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getTotalClicksByButton()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="button"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Clicks per Button</CardTitle>
          <CardDescription>
            Average clicks per user who clicked each button (top 15)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getAverageClicksByButton()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="button"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
