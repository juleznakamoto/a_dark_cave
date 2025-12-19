import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, differenceInDays, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

interface ChurnTabProps {
  churnDays: 1 | 3 | 5 | 7;
  setChurnDays: (value: 1 | 3 | 5 | 7) => void;
  gameSaves: any[];
  clickData: any[];
  selectedCubeEvents: Set<string>;
  setSelectedCubeEvents: (value: Set<string>) => void;
  COLORS: string[];
}

export default function ChurnTab(props: ChurnTabProps) {
  const {
    churnDays,
    setChurnDays,
    gameSaves,
    clickData,
    selectedCubeEvents,
    setSelectedCubeEvents,
    COLORS,
  } = props;

  const getCubeEventNumber = (eventId: string): number | null => {
    const match = eventId.match(/cube(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const getChurnedPlayers = () => {
    const now = new Date();
    const cutoffDate = subDays(now, churnDays);
    const churnedPlayers: Array<{
      userId: string;
      lastActivity: Date;
      daysSinceActivity: number;
    }> = [];

    const usersWithClicks = new Set<string>();
    clickData.forEach((entry) => usersWithClicks.add(entry.user_id));

    const userLastActivity = new Map<string, Date>();
    gameSaves.forEach((save) => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
    });

    usersWithClicks.forEach((userId) => {
      const lastActivity = userLastActivity.get(userId);

      if (!lastActivity) {
        return;
      }

      const isBeforeCutoff = lastActivity < cutoffDate;
      const daysSince = differenceInDays(now, lastActivity);

      const save = gameSaves.find((s) => s.user_id === userId);
      const hasCompletedGame =
        save?.game_state?.events?.cube15a ||
        save?.game_state?.events?.cube15b ||
        save?.game_state?.events?.cube13 ||
        save?.game_state?.events?.cube14a ||
        save?.game_state?.events?.cube14b ||
        save?.game_state?.events?.cube14c ||
        save?.game_state?.events?.cube14d;

      if (isBeforeCutoff && !hasCompletedGame) {
        churnedPlayers.push({
          userId: userId.substring(0, 8) + "...",
          lastActivity,
          daysSinceActivity: daysSince,
        });
      }
    });

    return churnedPlayers.sort(
      (a, b) => b.daysSinceActivity - a.daysSinceActivity,
    );
  };

  const cleanButtonName = (buttonId: string): string => {
    return buttonId
      .replace(/_\d{13,}_[\d.]+$/, "")
      .replace(/[-_]\d{13,}$/, "");
  };

  const getChurnedPlayersLastClicks = () => {
    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    const usersWithClicks = new Set<string>();
    clickData.forEach((entry) => usersWithClicks.add(entry.user_id));

    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach((save) => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      const hasCompletedGame =
        save.game_state?.events?.cube15a ||
        save.game_state?.events?.cube15b ||
        save.game_state?.events?.cube13 ||
        save.game_state?.events?.cube14a ||
        save.game_state?.events?.cube14b ||
        save.game_state?.events?.cube14c ||
        save.game_state?.events?.cube14d;
      if (
        activityDate < cutoffDate &&
        !hasCompletedGame &&
        usersWithClicks.has(save.user_id)
      ) {
        churnedUserIds.add(save.user_id);
      }
    });

    const userMaxPlaytime = new Map<string, string>();

    clickData.forEach((entry) => {
      if (churnedUserIds.has(entry.user_id)) {
        Object.keys(entry.clicks).forEach((playtimeKey) => {
          const minutes = parseInt(playtimeKey.replace("m", ""));
          if (!isNaN(minutes)) {
            const existingKey = userMaxPlaytime.get(entry.user_id);
            if (!existingKey) {
              userMaxPlaytime.set(entry.user_id, playtimeKey);
            } else {
              const existingMinutes = parseInt(existingKey.replace("m", ""));
              if (minutes > existingMinutes) {
                userMaxPlaytime.set(entry.user_id, playtimeKey);
              }
            }
          }
        });
      }
    });

    const buttonTotals: Record<string, number> = {};

    clickData.forEach((entry) => {
      if (churnedUserIds.has(entry.user_id)) {
        const maxPlaytimeKey = userMaxPlaytime.get(entry.user_id);
        if (maxPlaytimeKey && entry.clicks[maxPlaytimeKey]) {
          Object.entries(
            entry.clicks[maxPlaytimeKey] as Record<string, number>,
          ).forEach(([button, count]) => {
            const cleanButton = cleanButtonName(button);
            buttonTotals[cleanButton] =
              (buttonTotals[cleanButton] || 0) + count;
          });
        }
      }
    });

    const topClicks = Object.entries(buttonTotals)
      .map(([button, clicks]) => ({ button, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    return topClicks;
  };

  const getChurnedPlayersFirstTimeClicks = () => {
    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    const usersWithClicks = new Set<string>();
    clickData.forEach((entry) => usersWithClicks.add(entry.user_id));

    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach((save) => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      const hasCompletedGame =
        save.game_state?.events?.cube15a ||
        save.game_state?.events?.cube15b ||
        save.game_state?.events?.cube13 ||
        save.game_state?.events?.cube14a ||
        save.game_state?.events?.cube14b ||
        save.game_state?.events?.cube14c ||
        save.game_state?.events?.cube14d;
      if (
        activityDate < cutoffDate &&
        !hasCompletedGame &&
        usersWithClicks.has(save.user_id)
      ) {
        churnedUserIds.add(save.user_id);
      }
    });

    const buttonFirstTimeCount: Record<string, number> = {};

    clickData.forEach((entry) => {
      if (churnedUserIds.has(entry.user_id)) {
        Object.entries(entry.clicks).forEach(
          ([playtimeKey, clicksAtTime]: [string, any]) => {
            Object.entries(clicksAtTime as Record<string, number>).forEach(
              ([button, count]) => {
                const cleanButton = cleanButtonName(button);
                if (count === 1) {
                  buttonFirstTimeCount[cleanButton] =
                    (buttonFirstTimeCount[cleanButton] || 0) + 1;
                }
              },
            );
          },
        );
      }
    });

    const topFirstTimeClicks = Object.entries(buttonFirstTimeCount)
      .map(([button, count]) => ({ button, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return topFirstTimeClicks;
  };

  const getCubeEventsOverPlaytime = () => {
    const playtimeBuckets = new Map<number, Map<number, Set<string>>>();
    let maxBucket = 0;
    let maxCubeEvent = 0;

    gameSaves.forEach((save) => {
      const playTimeMinutes = save.game_state?.playTime
        ? Math.round(save.game_state.playTime / 1000 / 60)
        : 0;
      const bucket = Math.floor(playTimeMinutes / 60) * 60;
      maxBucket = Math.max(maxBucket, bucket);

      if (!playtimeBuckets.has(bucket)) {
        playtimeBuckets.set(bucket, new Map());
      }

      const bucketData = playtimeBuckets.get(bucket)!;
      const events = save.game_state?.events || {};

      Object.keys(events).forEach((eventKey) => {
        if (eventKey.startsWith("cube") && events[eventKey] === true) {
          const cubeNum = getCubeEventNumber(eventKey);
          if (cubeNum !== null) {
            maxCubeEvent = Math.max(maxCubeEvent, cubeNum);
            if (!bucketData.has(cubeNum)) {
              bucketData.set(cubeNum, new Set());
            }
            bucketData.get(cubeNum)!.add(save.user_id);
          }
        }
      });
    });

    const result: Array<{ time: string; [key: string]: any }> = [];
    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
      const hours = bucket / 60;
      const dataPoint: { time: string; [key: string]: any } = {
        time: hours === 0 ? "0h" : `${hours}h`,
      };

      const bucketData = playtimeBuckets.get(bucket);
      for (let cubeNum = 1; cubeNum <= maxCubeEvent; cubeNum++) {
        dataPoint[`Cube ${cubeNum}`] = bucketData?.get(cubeNum)?.size || 0;
      }

      result.push(dataPoint);
    }

    return result;
  };

  const getHighestCubeEventDistribution = () => {
    const highestCubeByPlayer = new Map<number, number>();

    gameSaves.forEach((save) => {
      const events = save.game_state?.events || {};
      let highestCube = 0;

      Object.keys(events).forEach((eventKey) => {
        if (eventKey.startsWith("cube") && events[eventKey] === true) {
          const cubeNum = getCubeEventNumber(eventKey);
          if (cubeNum !== null && cubeNum > highestCube) {
            highestCube = cubeNum;
          }
        }
      });

      if (highestCube > 0) {
        highestCubeByPlayer.set(
          highestCube,
          (highestCubeByPlayer.get(highestCube) || 0) + 1,
        );
      }
    });

    const maxCube = Math.max(...Array.from(highestCubeByPlayer.keys()), 0);
    const result: Array<{ cubeEvent: string; players: number }> = [];

    for (let i = 1; i <= maxCube; i++) {
      result.push({
        cubeEvent: `Cube ${i}`,
        players: highestCubeByPlayer.get(i) || 0,
      });
    }

    return result;
  };

  const getChurnedPlayersLastCubeEvents = () => {
    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach((save) => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      const hasCompletedGame =
        save.game_state?.events?.cube15a ||
        save.game_state?.events?.cube15b ||
        save.game_state?.events?.cube13 ||
        save.game_state?.events?.cube14a ||
        save.game_state?.events?.cube14b ||
        save.game_state?.events?.cube14c ||
        save.game_state?.events?.cube14d;
      if (activityDate < cutoffDate && !hasCompletedGame) {
        churnedUserIds.add(save.user_id);
      }
    });

    const cubeEventCounts = new Map<number, number>();
    let playersWithNoCubeEvents = 0;

    gameSaves.forEach((save) => {
      if (churnedUserIds.has(save.user_id)) {
        const events = save.game_state?.events || {};
        let highestCube = 0;

        Object.keys(events).forEach((eventKey) => {
          if (eventKey.startsWith("cube") && events[eventKey] === true) {
            const cubeNum = getCubeEventNumber(eventKey);
            if (cubeNum !== null && cubeNum > highestCube) {
              highestCube = cubeNum;
            }
          }
        });

        if (highestCube > 0) {
          cubeEventCounts.set(
            highestCube,
            (cubeEventCounts.get(highestCube) || 0) + 1,
          );
        } else {
          playersWithNoCubeEvents++;
        }
      }
    });

    const result: Array<{ cubeEvent: string; players: number }> = [];

    if (playersWithNoCubeEvents > 0) {
      result.push({
        cubeEvent: "No Cube Events",
        players: playersWithNoCubeEvents,
      });
    }

    const sortedEntries = Array.from(cubeEventCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    sortedEntries.forEach(([cubeNum, count]) => {
      result.push({
        cubeEvent: `Cube ${cubeNum}`,
        players: count,
      });
    });

    return result;
  };

  const getChurnRateOverTime = () => {
    const data: { day: string; churnRate: number }[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);

      const usersWithClicks = new Set<string>();
      clickData.forEach((entry) => usersWithClicks.add(entry.user_id));

      let churnedCount = 0;
      let totalCount = 0;

      gameSaves.forEach((save) => {
        const createdDate = parseISO(save.created_at);
        if (createdDate > dayStart) return;

        totalCount++;

        const cutoffDate = subDays(dayStart, churnDays);
        const activityDate = parseISO(save.updated_at);
        const hasCompletedGame =
          save.game_state?.events?.cube15a ||
          save.game_state?.events?.cube15b ||
          save.game_state?.events?.cube13 ||
          save.game_state?.events?.cube14a ||
          save.game_state?.events?.cube14b ||
          save.game_state?.events?.cube14c ||
          save.game_state?.events?.cube14d;

        if (
          activityDate < cutoffDate &&
          !hasCompletedGame &&
          usersWithClicks.has(save.user_id)
        ) {
          churnedCount++;
        }
      });

      const churnRate =
        totalCount > 0 ? Math.round((churnedCount / totalCount) * 100) : 0;

      data.push({
        day: format(date, "MMM dd"),
        churnRate,
      });
    }

    return data;
  };

  const getChurnPointDistribution = () => {
    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    const usersWithClicks = new Set<string>();
    clickData.forEach((entry) => usersWithClicks.add(entry.user_id));

    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach((save) => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      const hasCompletedGame =
        save.game_state?.events?.cube15a ||
        save.game_state?.events?.cube15b ||
        save.game_state?.events?.cube13 ||
        save.game_state?.events?.cube14a ||
        save.game_state?.events?.cube14b ||
        save.game_state?.events?.cube14c ||
        save.game_state?.events?.cube14d;
      if (
        activityDate < cutoffDate &&
        !hasCompletedGame &&
        usersWithClicks.has(save.user_id)
      ) {
        churnedUserIds.add(save.user_id);
      }
    });

    const userMaxPlaytime = new Map<string, number>();
    clickData.forEach((entry) => {
      if (churnedUserIds.has(entry.user_id)) {
        Object.keys(entry.clicks).forEach((playtimeKey) => {
          const minutes = parseInt(playtimeKey.replace("m", ""));
          if (!isNaN(minutes)) {
            const existing = userMaxPlaytime.get(entry.user_id) || 0;
            if (minutes > existing) {
              userMaxPlaytime.set(entry.user_id, minutes);
            }
          }
        });
      }
    });

    const buckets = new Map<number, number>();
    let maxBucket = 0;

    userMaxPlaytime.forEach((minutes) => {
      const bucket = Math.floor(minutes / 60) * 60;
      maxBucket = Math.max(maxBucket, bucket);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    });

    const result: Array<{ time: string; count: number }> = [];
    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
      const hours = bucket / 60;
      result.push({
        time: hours === 0 ? "0h" : `${hours}h`,
        count: buckets.get(bucket) || 0,
      });
    }

    return result;
  };

  const getCubeEventsOverRealTime = () => {
    console.log('=== getCubeEventsOverRealTime Debug ===');
    console.log('Total clickData entries:', clickData.length);
    
    // Extract cube button clicks from the clicks data structure
    // Looking for buttons like "cube-close-cube03-1766078383278"
    const cubeClicksByDate = new Map<string, Map<number, Set<string>>>();
    let maxCubeEvent = 0;
    let cubeButtonsFound = 0;

    clickData.forEach((entry, index) => {
      // Log first entry structure
      if (index === 0) {
        console.log('Sample entry structure:', {
          user_id: entry.user_id,
          clicks_keys: Object.keys(entry.clicks),
          sample_playtime_buttons: entry.clicks['40m'] ? Object.keys(entry.clicks['40m']).slice(0, 5) : 'no 40m'
        });
      }

      // entry.clicks is structured as: { "40m": { "cube-close-cube03-1766078383278": 1, ... } }
      Object.entries(entry.clicks).forEach(([playtimeKey, buttonClicks]) => {
        Object.keys(buttonClicks as Record<string, number>).forEach(buttonId => {
          // Match cube close buttons: cube-close-cube03-1766078383278
          const cubeMatch = buttonId.match(/cube-close-cube(\d+)-(\d+)/);

          if (cubeMatch) {
            cubeButtonsFound++;
            const cubeNum = parseInt(cubeMatch[1]);
            const timestamp = parseInt(cubeMatch[2]);
            maxCubeEvent = Math.max(maxCubeEvent, cubeNum);

            // Convert timestamp to date
            const date = format(new Date(timestamp), 'MMM dd');

            if (cubeButtonsFound <= 5) {
              console.log('Cube button found:', {
                buttonId,
                cubeNum,
                timestamp,
                date,
                user_id: entry.user_id
              });
            }

            if (!cubeClicksByDate.has(date)) {
              cubeClicksByDate.set(date, new Map());
            }

            const dateData = cubeClicksByDate.get(date)!;
            if (!dateData.has(cubeNum)) {
              dateData.set(cubeNum, new Set());
            }
            dateData.get(cubeNum)!.add(entry.user_id);
          }
        });
      });
    });

    console.log('Total cube buttons found:', cubeButtonsFound);
    console.log('Max cube event:', maxCubeEvent);
    console.log('Dates with cube events:', Array.from(cubeClicksByDate.keys()));

    // Convert to array and sort by date
    const sortedDates = Array.from(cubeClicksByDate.keys()).sort((a, b) => {
      return new Date(a + ' 2024').getTime() - new Date(b + ' 2024').getTime();
    });

    const result: Array<{ date: string; [key: string]: any }> = [];
    sortedDates.forEach(date => {
      const dataPoint: { date: string; [key: string]: any } = { date };
      const dateData = cubeClicksByDate.get(date)!;

      for (let cubeNum = 1; cubeNum <= maxCubeEvent; cubeNum++) {
        const cubeKey = `Cube ${cubeNum}`;
        dataPoint[cubeKey] = dateData.get(cubeNum)?.size || 0;
      }

      result.push(dataPoint);
    });

    console.log('Final result:', result);
    console.log('=== End Debug ===');
    
    return result;
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium">
          Churn definition (inactive for at least):
        </label>
        <Select
          value={churnDays.toString()}
          onValueChange={(value) =>
            setChurnDays(parseInt(value) as 1 | 3 | 5 | 7)
          }
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 day</SelectItem>
            <SelectItem value="3">3 days</SelectItem>
            <SelectItem value="5">5 days</SelectItem>
            <SelectItem value="7">7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Churned Players</CardTitle>
            <CardDescription>
              Players inactive for {churnDays}+ days and did not complete the game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {getChurnedPlayers().length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Churn Rate</CardTitle>
            <CardDescription>% of total players</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {gameSaves.length > 0
                ? Math.round(
                    (getChurnedPlayers().length / gameSaves.length) * 100,
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Churned Players List</CardTitle>
          <CardDescription>
            Players who stopped playing (sorted by inactivity)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getChurnedPlayers().map((player, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="font-medium">{player.userId}</p>
                  <p className="text-sm text-muted-foreground">
                    Last activity:{" "}
                    {format(player.lastActivity, "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
                <p className="font-bold text-red-500">
                  {player.daysSinceActivity} days ago
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 20 Last Buttons Clicked Before Churning</CardTitle>
          <CardDescription>
            What were the last actions churned players performed at their final playtime?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getChurnedPlayersLastClicks()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="button"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="clicks" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 20 First-Time Clicks by Churned Players</CardTitle>
          <CardDescription>
            Buttons clicked exactly once (count = 1) - what did churned players try just once?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getChurnedPlayersFirstTimeClicks()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="button"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#9333ea" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cube Events Over Playtime</CardTitle>
          <CardDescription>
            Number of players who have seen each cube event at each playtime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const chartData = getCubeEventsOverPlaytime();
                  if (chartData.length === 0) return;
                  const cubeKeys = Object.keys(chartData[0]).filter(
                    (key) => key.startsWith("Cube "),
                  );
                  setSelectedCubeEvents(new Set(cubeKeys));
                }}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedCubeEvents(new Set())}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Deselect All
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              {(() => {
                const chartData = getCubeEventsOverPlaytime();
                if (chartData.length === 0) return null;

                const cubeKeys = Object.keys(chartData[0]).filter(
                  (key) => key.startsWith("Cube "),
                );

                return cubeKeys.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCubeEvents.has(key)}
                      onChange={(e) => {
                        const newSet = new Set(selectedCubeEvents);
                        if (e.target.checked) {
                          newSet.add(key);
                        } else {
                          newSet.delete(key);
                        }
                        setSelectedCubeEvents(newSet);
                      }}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{key}</span>
                  </label>
                ));
              })()}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getCubeEventsOverPlaytime()}>
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
                  value: "Players",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              {(() => {
                const chartData = getCubeEventsOverPlaytime();
                if (chartData.length === 0) return null;

                const cubeKeys = Object.keys(chartData[0]).filter(
                  (key) => key.startsWith("Cube "),
                );

                return cubeKeys
                  .filter((key) => selectedCubeEvents.has(key))
                  .map((key, index) => (
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
          <CardTitle>Highest Cube Event Distribution</CardTitle>
          <CardDescription>
            What is the highest cube event players have seen?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getHighestCubeEventDistribution()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="cubeEvent"
                label={{
                  value: "Cube Event",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Players",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="players"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last Cube Events for Churned Players</CardTitle>
          <CardDescription>
            What was the highest cube event churned players saw before leaving?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getChurnedPlayersLastCubeEvents()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="cubeEvent"
                label={{
                  value: "Cube Event",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Players",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="players" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Churn Point Distribution</CardTitle>
          <CardDescription>
            At what playtime did churned players stop playing?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getChurnPointDistribution()}>
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
                  value: "Players",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ff8042"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Churn Rate Over Time (Last 30 Days)</CardTitle>
          <CardDescription>
            Percentage of churned players over time (inactive for {churnDays}+ days, excluding completed games)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getChurnRateOverTime()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis
                label={{
                  value: "Churn Rate (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="churnRate"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Churn Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cube Events Over Real Time</CardTitle>
          <CardDescription>
            When players actually clicked cube close buttons (by actual date/time)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getCubeEventsOverRealTime()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                label={{
                  value: "Date",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                label={{
                  value: "Players",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              {(() => {
                const chartData = getCubeEventsOverRealTime();
                if (chartData.length === 0) return null;

                const cubeKeys = Object.keys(chartData[0]).filter(
                  (key) => key.startsWith("Cube "),
                );

                return cubeKeys.map((key, index) => (
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