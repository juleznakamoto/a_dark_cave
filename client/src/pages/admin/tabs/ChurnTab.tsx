import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { differenceInDays, subDays } from "date-fns";
import {
  computeHutLadderFunnel,
  hutLadderReachChartData,
  hutLadderStepDropChartData,
  type HutLadderCohortDays,
} from "@shared/hutLadderAdminStats";
import {
  mapChurnRateRpcRows,
  type ChurnRateDayPoint,
} from "@shared/churnRateAdminStats";
import { logger } from "@/lib/logger";
import {
  ADMIN_TWELVE_MONTH_CHART_DAYS,
  adminChartXAxisIntervalForDays,
  ChartTimeRangeSelectHutLadder,
  ChartTimeRangeSelectTwelveMonth,
  hutLadderCohortTitleSuffix,
  type AdminTwelveMonthChartRange,
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
  environment: "dev" | "prod";
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
    environment,
  } = props;

  const [hutLadderDays, setHutLadderDays] = useState<HutLadderCohortDays>(60);
  const [churnRateChartRange, setChurnRateChartRange] =
    useState<AdminTwelveMonthChartRange>("1m");
  const churnRateChartDays = ADMIN_TWELVE_MONTH_CHART_DAYS[churnRateChartRange];
  const [churnRateOverTime, setChurnRateOverTime] = useState<ChurnRateDayPoint[]>(
    [],
  );
  const [churnRateLoading, setChurnRateLoading] = useState(false);
  const [churnRateError, setChurnRateError] = useState<string | null>(null);

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
  const wooden10StonePct =
    hutLadderFunnel.wooden10Count > 0
      ? Math.round(
        (1000 * hutLadderFunnel.wooden10WithStone) /
        hutLadderFunnel.wooden10Count,
      ) / 10
      : 0;

  useEffect(() => {
    let cancelled = false;
    setChurnRateLoading(true);
    setChurnRateError(null);

    const query = new URLSearchParams({
      env: environment,
      churnDays: String(churnDays),
      windowDays: String(churnRateChartDays),
    });

    fetch(`/api/admin/churn-rate?${query}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : `Failed to load churn rate (${res.status})`,
          );
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const series = Array.isArray(data?.series) ? data.series : [];
        setChurnRateOverTime(mapChurnRateRpcRows(series, churnRateChartDays));
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error("Failed to load churn rate over time:", err);
        setChurnRateOverTime([]);
        setChurnRateError(
          err instanceof Error ? err.message : "Failed to load churn rate",
        );
      })
      .finally(() => {
        if (!cancelled) setChurnRateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [environment, churnDays, churnRateChartDays]);

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
            <CardTitle>Hut ladder — wooden → stone</CardTitle>
            <CardDescription>
              Reach funnel among non-referred gameStarted saves created in the{" "}
              {hutLadderCohortTitleSuffix(hutLadderDays).toLowerCase()} (n=
              {hutLadderFunnel.startedCount}
              {hutLadderFunnel.excludedReferredCount > 0
                ? `; excluded ${hutLadderFunnel.excludedReferredCount} referred`
                : ""}
              ). First stone hut unlocks at wooden hut ≥10 (both modes). Cruel
              only raises caps 10→12.
            </CardDescription>
          </div>
          <ChartTimeRangeSelectHutLadder
            value={hutLadderDays}
            onChange={setHutLadderDays}
          />
        </CardHeader>
        <CardContent className="space-y-6">
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
            <h3 className="text-sm font-medium mb-2">
              Players reaching ≥N huts (W0–W10, then S1–S10)
            </h3>
            <ChartContainer
              config={{
                players: { label: "Players ≥N", color: COLORS[0] },
              }}
              className="h-[320px] w-full"
            >
              <BarChart data={hutReachChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="step"
                  interval={0}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Hut ladder step",
                    position: "insideBottom",
                    offset: -2,
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  label={{
                    value: "Players",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
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
                  ]}
                />
                <Bar dataKey="players" name="Players ≥N">
                  {hutReachChart.map((entry) => (
                    <Cell
                      key={`reach-${entry.step}`}
                      fill={entry.kind === "wooden" ? COLORS[0] : COLORS[1]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">
              Step drop-off at each hut (%) (W0–W10, then S1–S10)
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
                <XAxis dataKey="step" interval={0} tick={{ fontSize: 10 }} />
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
                  ]}
                />
                <Bar dataKey="drop" name="Step drop %">
                  {hutDropChart.map((entry) => (
                    <Cell
                      key={`drop-${entry.step}`}
                      fill={
                        entry.kind === "wooden"
                          ? (COLORS[2] ?? COLORS[0])
                          : (COLORS[3] ?? COLORS[1])
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground mt-2">
              W0 is the baseline (0% drop). S1 step drop is vs wooden ≥10
              (unlock gate), not vs all starters.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
          <div>
            <CardTitle>Churn Rate Over Time</CardTitle>
            <CardDescription>
              Among non-referred saves that existed by each day: % with last
              activity older than {churnDays}+ days (completed games excluded
              from churned). Aggregated in Supabase (UTC day boundaries). Based
              on current updated_at (returners won&apos;t show as historically
              churned).
            </CardDescription>
          </div>
          <ChartTimeRangeSelectTwelveMonth
            value={churnRateChartRange}
            onChange={setChurnRateChartRange}
          />
        </CardHeader>
        <CardContent>
          {churnRateLoading ? (
            <p className="text-sm text-muted-foreground">Loading churn rate…</p>
          ) : churnRateError ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {churnRateError}. Apply migration{" "}
              <code className="text-xs">031_admin_churn_rate_over_time.sql</code>{" "}
              if the RPC is missing.
            </p>
          ) : (
          <ChartContainer
            config={{
              churnRate: { label: "Churn Rate (%)", color: "#dc2626" },
            }}
            className="h-[400px] w-full"
          >
            <LineChart data={churnRateOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                interval={adminChartXAxisIntervalForDays(churnRateChartDays)}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: "Churn Rate (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="churnRate"
                stroke="#dc2626"
                strokeWidth={2}
                dot={churnRateChartDays <= 30 ? { r: 3 } : false}
                name="Churn Rate (%)"
              />
            </LineChart>
          </ChartContainer>
          )}
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