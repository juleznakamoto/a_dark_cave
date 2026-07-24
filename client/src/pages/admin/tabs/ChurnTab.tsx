import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { differenceInDays, subDays } from "date-fns";
import {
  computeFinisherRatesByCohort,
  computeHutLadderFunnel,
  hutLadderReachChartData,
  hutLadderStepDropChartData,
  hutLadderDropVsStartedChartData,
  type HutLadderCohortDays,
} from "@shared/hutLadderAdminStats";
import {
  ChartTimeRangeSelectHutLadder,
  hutLadderCohortTitleSuffix,
} from "../adminChartTimeRange";

const MAX_PLAYTIME_CHART_HOURS = 18;
const MAX_PLAYTIME_CHART_MINUTES = MAX_PLAYTIME_CHART_HOURS * 60;

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

  const [hutLadderDays, setHutLadderDays] = useState<HutLadderCohortDays>(60);

  const hutLadderFunnel = useMemo(
    () => computeHutLadderFunnel(gameSaves, hutLadderDays),
    [gameSaves, hutLadderDays],
  );
  const hutReachChart = useMemo(
    () => hutLadderReachChartData(hutLadderFunnel),
    [hutLadderFunnel],
  );
  const hutDropChart = useMemo(
    () => hutLadderStepDropChartData(hutLadderFunnel),
    [hutLadderFunnel],
  );
  const hutDropVsStartedChart = useMemo(
    () => hutLadderDropVsStartedChartData(hutLadderFunnel),
    [hutLadderFunnel],
  );
  const finisherRates = useMemo(
    () => computeFinisherRatesByCohort(gameSaves),
    [gameSaves],
  );
  const wooden10StonePct =
    hutLadderFunnel.wooden10Count > 0
      ? Math.round(
        (1000 * hutLadderFunnel.wooden10WithStone) /
        hutLadderFunnel.wooden10Count,
      ) / 10
      : 0;

  const reachBarFill = (kind: "wooden" | "stone" | "wave") => {
    if (kind === "wooden") return COLORS[0];
    if (kind === "stone") return COLORS[1];
    return COLORS[4] ?? COLORS[0];
  };
  const dropBarFill = (kind: "wooden" | "stone" | "wave") => {
    if (kind === "wooden") return COLORS[2] ?? COLORS[0];
    if (kind === "stone") return COLORS[3] ?? COLORS[1];
    return COLORS[5] ?? COLORS[4] ?? COLORS[0];
  };

  /** Old slim payloads omitted flags/buildings — funnel stays empty until API restart + refetch. */
  const hutLadderPayloadReady = useMemo(() => {
    if (gameSaves.length === 0) return true;
    return gameSaves.some(
      (s) =>
        s?.game_state?.flags?.gameStarted === true ||
        typeof s?.game_state?.buildings?.woodenHut === "number" ||
        typeof s?.game_state?.buildings?.stoneHut === "number",
    );
  }, [gameSaves]);

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
    let maxCubeEvent = 0;

    gameSaves.forEach((save) => {
      const playTimeMinutes = save.game_state?.playTime
        ? Math.round(save.game_state.playTime / 1000 / 60)
        : 0;
      const bucket = Math.min(
        Math.floor(playTimeMinutes / 60) * 60,
        MAX_PLAYTIME_CHART_MINUTES,
      );

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

    const result: Array<{ time: string;[key: string]: any }> = [];
    for (let bucket = 0; bucket <= MAX_PLAYTIME_CHART_MINUTES; bucket += 60) {
      const hours = bucket / 60;
      const dataPoint: { time: string;[key: string]: any } = {
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

    userMaxPlaytime.forEach((minutes) => {
      const bucket = Math.min(
        Math.floor(minutes / 60) * 60,
        MAX_PLAYTIME_CHART_MINUTES,
      );
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    });

    const result: Array<{ time: string; count: number }> = [];
    for (let bucket = 0; bucket <= MAX_PLAYTIME_CHART_MINUTES; bucket += 60) {
      const hours = bucket / 60;
      result.push({
        time: hours === 0 ? "0h" : `${hours}h`,
        count: buckets.get(bucket) || 0,
      });
    }

    return result;
  };

  const getCubeEventsOverRealTime = () => {
    // Extract cube button clicks from the clicks data structure
    // Looking for buttons like "cube-close-cube03-1766078383278"
    // Group by playtime bucket (e.g., "40m", "80m", etc.)
    const cubeClicksByPlaytime = new Map<number, Map<number, Set<string>>>();
    let maxCubeEvent = 0;

    clickData.forEach((entry) => {
      // entry.clicks is structured as: { "40m": { "cube-close-cube03-1766078383278": 1, ... } }
      Object.entries(entry.clicks).forEach(([playtimeKey, buttonClicks]) => {
        const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
        if (isNaN(playtimeMinutes)) return;

        Object.keys(buttonClicks as Record<string, number>).forEach(buttonId => {
          // Match cube close buttons: cube-close-cube03-1766078383278
          const cubeMatch = buttonId.match(/cube-close-cube(\d+)-/);

          if (cubeMatch) {
            const cubeNum = parseInt(cubeMatch[1]);
            maxCubeEvent = Math.max(maxCubeEvent, cubeNum);

            if (!cubeClicksByPlaytime.has(playtimeMinutes)) {
              cubeClicksByPlaytime.set(playtimeMinutes, new Map());
            }

            const playtimeData = cubeClicksByPlaytime.get(playtimeMinutes)!;
            if (!playtimeData.has(cubeNum)) {
              playtimeData.set(cubeNum, new Set());
            }
            playtimeData.get(cubeNum)!.add(entry.user_id);
          }
        });
      });
    });

    // Aggregate 5-minute buckets into hourly buckets
    const hourlyBuckets = new Map<number, Map<number, Set<string>>>();

    cubeClicksByPlaytime.forEach((cubeData, playtime) => {
      const hourlyBucket = Math.min(
        Math.floor(playtime / 60) * 60,
        MAX_PLAYTIME_CHART_MINUTES,
      );

      if (!hourlyBuckets.has(hourlyBucket)) {
        hourlyBuckets.set(hourlyBucket, new Map());
      }

      const hourlyData = hourlyBuckets.get(hourlyBucket)!;

      cubeData.forEach((users, cubeNum) => {
        if (!hourlyData.has(cubeNum)) {
          hourlyData.set(cubeNum, new Set());
        }

        // Merge user sets
        users.forEach(user => hourlyData.get(cubeNum)!.add(user));
      });
    });

    // Convert to array and create buckets
    const result: Array<{ time: string;[key: string]: any }> = [];

    for (let bucket = 0; bucket <= MAX_PLAYTIME_CHART_MINUTES; bucket += 60) {
      const hours = bucket / 60;
      const dataPoint: { time: string;[key: string]: any } = {
        time: hours === 0 ? "0h" : `${hours}h`,
      };

      const hourlyData = hourlyBuckets.get(bucket);
      for (let cubeNum = 1; cubeNum <= maxCubeEvent; cubeNum++) {
        const cubeKey = `Cube ${cubeNum}`;
        dataPoint[cubeKey] = hourlyData?.get(cubeNum)?.size || 0;
      }

      result.push(dataPoint);
    }

    return result;
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
          <div>
            <CardTitle>Hut ladder — wooden → stone → waves</CardTitle>
            <CardDescription>
              Reach funnel among non-referred gameStarted saves created in the{" "}
              {hutLadderCohortTitleSuffix(hutLadderDays).toLowerCase()} (n=
              {hutLadderFunnel.startedCount}
              {hutLadderFunnel.excludedReferredCount > 0
                ? `; excluded ${hutLadderFunnel.excludedReferredCount} referred`
                : ""}
              ). First stone hut unlocks at wooden hut ≥10; attack waves A1–A10
              follow stone hut ≥10. Cruel only raises hut caps 10→12.
            </CardDescription>
          </div>
          <ChartTimeRangeSelectHutLadder
            value={hutLadderDays}
            onChange={setHutLadderDays}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Finisher rate</CardTitle>
              <CardDescription>
                % of non-referred gameStarted saves in each window who finished
                the game (gameComplete or ending cube)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {finisherRates.map((row) => (
                  <div
                    key={`finisher-${row.days}`}
                    className="rounded-md border border-border/60 px-3 py-2"
                  >
                    <p className="text-xs text-muted-foreground">
                      Last {row.days}d
                    </p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {row.ratePct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {row.finishedCount}/{row.startedCount}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {!hutLadderPayloadReady ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Loaded saves are missing hut fields (flags/buildings). Restart the
              local API server, then hard-refresh this page so Churn can refetch
              saves.
            </p>
          ) : hutLadderFunnel.startedCount > 100 &&
            hutLadderFunnel.excludedReferredCount === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              No referred saves were excluded in this window — slim payload may
              be missing referralProcessed. Restart the API and hard-refresh so
              early hut drop isn&apos;t inflated by referral bonus-farms.
            </p>
          ) : hutLadderFunnel.startedCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              No gameStarted saves with created_at in this window (or saves not
              loaded yet).
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Of players who reach wooden ≥10, {hutLadderFunnel.wooden10WithStone}/
              {hutLadderFunnel.wooden10Count} ({wooden10StonePct}%) also have stone
              ≥1 — the large “first stone” drop is mostly failing to finish the
              wooden ladder, not failing the stone build.
            </p>
          )}

          <div>
            <p className="text-sm font-medium mb-1">
              Total players: {hutLadderFunnel.startedCount}
            </p>
            <h3 className="text-sm font-medium mb-2">
              % of starters reaching ≥N (W0–W10, S1–S10, then A1–A10)
            </h3>
            <ChartContainer
              config={{
                pctOfStarted: {
                  label: "% of starters ≥N",
                  color: COLORS[0],
                },
              }}
              className="h-[320px] w-full"
            >
              <BarChart data={hutReachChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="step"
                  interval={0}
                  tick={{ fontSize: 9 }}
                  label={{
                    value: "Ladder step",
                    position: "insideBottom",
                    offset: -2,
                  }}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  label={{
                    value: "% of starters",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <>
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {typeof value === "number"
                              ? value.toFixed(1)
                              : value}
                            % ({item.payload?.players ?? 0} players)
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Legend
                  payload={[
                    {
                      value: "Wooden hut ≥N",
                      type: "square",
                      color: COLORS[0],
                    },
                    {
                      value: "Stone hut ≥N",
                      type: "square",
                      color: COLORS[1],
                    },
                    {
                      value: "Attack wave ≥N",
                      type: "square",
                      color: COLORS[4] ?? COLORS[0],
                    },
                  ]}
                />
                <Bar dataKey="pctOfStarted" name="% of starters ≥N">
                  {hutReachChart.map((entry) => (
                    <Cell
                      key={`reach-${entry.step}`}
                      fill={reachBarFill(entry.kind)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">
              Step drop-off (%) (W0–W10, S1–S10, then A1–A10)
            </h3>
            <ChartContainer
              config={{
                drop: {
                  label: "Step drop %",
                  color: COLORS[2] ?? COLORS[0],
                },
              }}
              className="h-[280px] w-full"
            >
              <BarChart data={hutDropChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" interval={0} tick={{ fontSize: 9 }} />
                <YAxis
                  unit="%"
                  label={{
                    value: "Drop vs previous (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend
                  payload={[
                    {
                      value: "Wooden step drop %",
                      type: "square",
                      color: COLORS[2] ?? COLORS[0],
                    },
                    {
                      value: "Stone step drop %",
                      type: "square",
                      color: COLORS[3] ?? COLORS[1],
                    },
                    {
                      value: "Wave step drop %",
                      type: "square",
                      color: COLORS[5] ?? COLORS[4] ?? COLORS[0],
                    },
                  ]}
                />
                <Bar dataKey="drop" name="Step drop %">
                  {hutDropChart.map((entry) => (
                    <Cell
                      key={`drop-${entry.step}`}
                      fill={dropBarFill(entry.kind)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground mt-2">
              W0 is the baseline (0% drop). S1 step drop is vs wooden ≥10; A1
              step drop is vs stone ≥10 (unlock gates), not vs all starters.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">
              Drop vs starters (%) (W0–W10, S1–S10, then A1–A10)
            </h3>
            <ChartContainer
              config={{
                drop: {
                  label: "Drop vs starters %",
                  color: COLORS[2] ?? COLORS[0],
                },
              }}
              className="h-[280px] w-full"
            >
              <BarChart data={hutDropVsStartedChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" interval={0} tick={{ fontSize: 9 }} />
                <YAxis
                  unit="%"
                  label={{
                    value: "Drop vs starters (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend
                  payload={[
                    {
                      value: "Wooden drop vs starters %",
                      type: "square",
                      color: COLORS[2] ?? COLORS[0],
                    },
                    {
                      value: "Stone drop vs starters %",
                      type: "square",
                      color: COLORS[3] ?? COLORS[1],
                    },
                    {
                      value: "Wave drop vs starters %",
                      type: "square",
                      color: COLORS[5] ?? COLORS[4] ?? COLORS[0],
                    },
                  ]}
                />
                <Bar dataKey="drop" name="Drop vs starters %">
                  {hutDropVsStartedChart.map((entry) => (
                    <Cell
                      key={`drop-start-${entry.step}`}
                      fill={dropBarFill(entry.kind)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Same steps as above, but each bar is players lost at that step ÷
              total starters (not ÷ previous step). Bars sum toward total cohort
              loss along the ladder. S1 / A1 still use wooden ≥10 / stone ≥10 as
              the previous count.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="overflow-x-auto">
              <h3 className="text-sm font-medium mb-2">Wooden hut reach</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Own</th>
                    <th className="py-1.5 pr-2 font-medium">Players</th>
                    <th className="py-1.5 pr-2 font-medium">% started</th>
                    <th className="py-1.5 pr-2 font-medium">Step drop</th>
                    <th className="py-1.5 font-medium">Keep</th>
                  </tr>
                </thead>
                <tbody>
                  {hutLadderFunnel.wooden.map((row) => (
                    <tr key={`wh-${row.level}`} className="border-b border-border/60">
                      <td className="py-1.5 pr-2">{row.label}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{row.players}</td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {row.pctOfStarted.toFixed(1)}%
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {row.stepDropPct === null
                          ? "—"
                          : `−${row.stepDropPct.toFixed(1)}%`}
                      </td>
                      <td className="py-1.5 tabular-nums">
                        {row.stepKeepPct === null
                          ? "—"
                          : `${row.stepKeepPct.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <h3 className="text-sm font-medium mb-2">Stone hut reach</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Own</th>
                    <th className="py-1.5 pr-2 font-medium">Players</th>
                    <th className="py-1.5 pr-2 font-medium">% started</th>
                    <th className="py-1.5 pr-2 font-medium">Step drop</th>
                    <th className="py-1.5 font-medium">Keep</th>
                  </tr>
                </thead>
                <tbody>
                  {hutLadderFunnel.stone.map((row) => (
                    <tr key={`sh-${row.level}`} className="border-b border-border/60">
                      <td className="py-1.5 pr-2">{row.label}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{row.players}</td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {row.pctOfStarted.toFixed(1)}%
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {row.stepDropPct === null
                          ? "—"
                          : `−${row.stepDropPct.toFixed(1)}%`}
                      </td>
                      <td className="py-1.5 tabular-nums">
                        {row.stepKeepPct === null
                          ? "—"
                          : `${row.stepKeepPct.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <h3 className="text-sm font-medium mb-2">Attack wave reach</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Won</th>
                    <th className="py-1.5 pr-2 font-medium">Players</th>
                    <th className="py-1.5 pr-2 font-medium">% started</th>
                    <th className="py-1.5 pr-2 font-medium">Step drop</th>
                    <th className="py-1.5 font-medium">Keep</th>
                  </tr>
                </thead>
                <tbody>
                  {hutLadderFunnel.waves.map((row) => (
                    <tr key={`aw-${row.level}`} className="border-b border-border/60">
                      <td className="py-1.5 pr-2">{row.label}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{row.players}</td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {row.pctOfStarted.toFixed(1)}%
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {row.stepDropPct === null
                          ? "—"
                          : `−${row.stepDropPct.toFixed(1)}%`}
                      </td>
                      <td className="py-1.5 tabular-nums">
                        {row.stepKeepPct === null
                          ? "—"
                          : `${row.stepKeepPct.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <CardTitle>Top 20 First-Time Clicks by Churned Players</CardTitle>
          <CardDescription>
            Buttons clicked exactly once (count = 1) - what did churned players try just once?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <BarChart data={getChurnedPlayersFirstTimeClicks()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="button"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#9333ea" />
            </BarChart>
          </ChartContainer>
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
          <ChartContainer config={{}} className="h-[400px] w-full">
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
              <ChartTooltip content={<ChartTooltipContent />} />
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
          </ChartContainer>
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
          <ChartContainer config={{}} className="h-[400px] w-full">
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="players"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
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
          <ChartContainer config={{}} className="h-[400px] w-full">
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="players" fill="#ffc658" />
            </BarChart>
          </ChartContainer>
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
          <ChartContainer config={{}} className="h-[400px] w-full">
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ff8042"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cube Events Over Playtime (from Button Clicks)</CardTitle>
          <CardDescription>
            When players actually clicked cube close buttons (by playtime bucket)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <LineChart data={getCubeEventsOverRealTime()}>
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
              <ChartTooltip content={<ChartTooltipContent />} />
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
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}