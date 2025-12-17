import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  format,
  differenceInDays,
  isWithinInterval,
  parseISO,
} from "date-fns";

// Import tab components
import OverviewTab from "./tabs/OverviewTab";
import EngagementTab from "./tabs/EngagementTab";
import ClicksTab from "./tabs/ClicksTab";
import CompletionTab from "./tabs/CompletionTab";
import PurchasesTab from "./tabs/PurchasesTab";
import ReferralsTab from "./tabs/ReferralsTab";
import ChurnTab from "./tabs/ChurnTab";
import SleepTab from "./tabs/SleepTab";
import ResourcesTab from "./tabs/ResourcesTab";
import UpgradesTab from "./tabs/UpgradesTab";
import LookupTab from "./tabs/LookupTab";

interface ButtonClickData {
  user_id: string;
  clicks: Record<string, Record<string, number>>; // Changed to Record<string, Record<string, number>> to match the structure
  timestamp: string; // Added timestamp for filtering by date
  game_state_snapshot?: any; // Added for snapshotting state at the time of click
}

interface GameSaveData {
  user_id: string;
  game_state: any;
  updated_at: string;
  created_at: string;
}

interface PurchaseData {
  user_id: string;
  item_id: string;
  item_name: string;
  price_paid: number;
  purchased_at: string;
  bundle_id?: string; // Added bundle_id field
}

// Admin emails from environment variable (comma-separated)
const getAdminEmails = (): string[] => {
  const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || "";
  return adminEmailsEnv
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
};

// Helper function to clean button names by removing timestamp suffixes
const cleanButtonName = (buttonId: string): string => {
  // Remove timestamp suffixes and random number suffixes from merchant trades
  // Patterns: _1764039531673_0.6389963990042614 or _1764039531673 or -1764039531673
  return buttonId
    .replace(/_\d{13,}_[\d.]+$/, "") // Remove _timestamp_randomNumber
    .replace(/[-_]\d{13,}$/, ""); // Remove -timestamp or _timestamp
};

// Helper function to filter data by time range - defined outside component as pure function
function filterByTimeRange<
  T extends {
    timestamp?: string;
    updated_at?: string;
    purchased_at?: string;
    created_at?: string;
  }
>(
  data: T[],
  dateField: keyof T,
  timeRange: "1d" | "3d" | "7d" | "30d" | "all"
): T[] {
  if (timeRange === "all") return data;

  const now = new Date();
  let cutoffDate: Date;

  switch (timeRange) {
    case "1d":
      cutoffDate = subDays(now, 1);
      break;
    case "3d":
      cutoffDate = subDays(now, 3);
      break;
    case "7d":
      cutoffDate = subDays(now, 7);
      break;
    case "30d":
      cutoffDate = subDays(now, 30);
      break;
    default:
      return data;
  }

  return data.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue || typeof dateValue !== "string") return false;
    const itemDate = parseISO(dateValue);
    return itemDate >= cutoffDate;
  });
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states (raw, unfiltered)
  const [rawClickData, setRawClickData] = useState<ButtonClickData[]>([]);
  const [rawGameSaves, setRawGameSaves] = useState<GameSaveData[]>([]);
  const [rawPurchases, setRawPurchases] = useState<PurchaseData[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [totalUserCount, setTotalUserCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date()); // State to track last data update
  const [dauData, setDauData] = useState<Array<{ date: string; active_user_count: number }>>([]);
  const [emailConfirmationStats, setEmailConfirmationStats] = useState<any>({
    allTime: {
      totalRegistrations: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    },
    last30Days: {
      totalRegistrations: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    },
    last7Days: {
      totalRegistrations: 0,
      confirmedUsers: 0,
      unconfirmedUsers: 0,
      totalConfirmationDelay: 0,
      usersWithSignIn: 0,
    },
  });

  // Filter states
  const [timeRange, setTimeRange] = useState<"1d" | "3d" | "7d" | "30d" | "all">(
    "30d",
  );

  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedButtons, setSelectedButtons] = useState<Set<string>>(
    new Set(["mine", "hunt", "chopWood", "caveExplore"]),
  ); // Initialize with all buttons
  const [selectedClickTypes, setSelectedClickTypes] = useState<Set<string>>(
    new Set(),
  ); // For individual click type chart
  const [environment, setEnvironment] = useState<"dev" | "prod">("prod");
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false);
  const [churnDays, setChurnDays] = useState<1 | 3 | 5 | 7>(3);

  // User lookup states
  const [lookupUserId, setLookupUserId] = useState<string>("");
  const [lookupType, setLookupType] = useState<"id" | "email">("id");
  const [lookupResult, setLookupResult] = useState<GameSaveData | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>("");

  // State for selected resources
  const [selectedResources, setSelectedResources] = useState<Set<string>>(
    new Set(["food", "wood", "stone", "iron"]),
  );

  // State for selected stats
  const [selectedStats, setSelectedStats] = useState<Set<string>>(
    new Set(["strength", "knowledge", "luck", "madness"]),
  );

  // State for selected mining types
  const [selectedMiningTypes, setSelectedMiningTypes] = useState<Set<string>>(
    new Set(["mineStone", "mineIron", "mineCoal", "mineSulfur", "mineObsidian", "mineAdamant"]),
  );

  // State for selected cube events
  const [selectedCubeEvents, setSelectedCubeEvents] = useState<Set<string>>(new Set());

  // Prefiltered data based on timeRange - MOVED AFTER ALL useState
  const clickData = useMemo(() => filterByTimeRange(rawClickData, "timestamp", timeRange), [rawClickData, timeRange]);
  const gameSaves = useMemo(() => filterByTimeRange(rawGameSaves, "updated_at", timeRange), [rawGameSaves, timeRange]);
  const purchases = useMemo(() => filterByTimeRange(rawPurchases, "purchased_at", timeRange), [rawPurchases, timeRange]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Reload data when environment changes
  useEffect(() => {
    if (isAuthorized) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [environment, isAuthorized]);

  // Helper function to filter data by user
  const filterByUser = <T extends { user_id: string }>(data: T[]): T[] => {
    if (selectedUser === "all") {
      return data;
    }
    return data.filter((item) => item.user_id === selectedUser);
  };

  // Define all hooks BEFORE conditional returns to comply with React rules
  const getButtonClicksOverTime = useCallback(() => {
    const filteredClickData = selectedUser === "all"
      ? clickData
      : clickData.filter((d) => d.user_id === selectedUser);

    const filteredByCompletion = showCompletedOnly
      ? filteredClickData.filter((d) => {
          const save = gameSaves.find((s) => s.user_id === d.user_id);
          return save && (
            save.game_state?.events?.cube15a ||
            save.game_state?.events?.cube15b ||
            save.game_state?.events?.cube13 ||
            save.game_state?.events?.cube14a ||
            save.game_state?.events?.cube14b ||
            save.game_state?.events?.cube14c ||
            save.game_state?.events?.cube14d
          );
        })
      : filteredClickData;

    if (filteredByCompletion.length === 0) {
      return Array.from({ length: 24 }, (_, i) => ({ time: `${i}h`, clicks: 0 }));
    }

    const timeBuckets: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      timeBuckets[`${i}h`] = 0;
    }

    // Group clicks by user to calculate per-user first click time
    const userClicks = new Map<string, typeof filteredByCompletion>();
    filteredByCompletion.forEach((entry) => {
      if (!userClicks.has(entry.user_id)) {
        userClicks.set(entry.user_id, []);
      }
      userClicks.get(entry.user_id)!.push(entry);
    });

    // Process each user's clicks with their own first click time
    userClicks.forEach((userClickData) => {
      if (userClickData.length === 0) return;

      // Sort by timestamp to ensure we get the actual first click
      userClickData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const firstClickTime = new Date(userClickData[0].timestamp).getTime();

      userClickData.forEach((entry) => {
        const elapsed = (new Date(entry.timestamp).getTime() - firstClickTime) / 1000;
        const bucket = Math.floor(elapsed / 3600);

        if (bucket >= 0 && bucket < 24) {
          const bucketKey = `${bucket}h`;
          const clickCount = Object.values(entry.clicks).reduce((sum, playtimeClicks: any) => {
            return sum + Object.values(playtimeClicks).reduce((s: number, c) => s + (c as number), 0);
          }, 0);
          timeBuckets[bucketKey] += clickCount;
        }
      });
    });

    return Object.entries(timeBuckets)
      .map(([time, clicks]) => ({ time, clicks }))
      .sort((a, b) => parseInt(a.time) - parseInt(b.time));
  }, [clickData, gameSaves, selectedUser, showCompletedOnly]);

  const getClickTypesByTimestamp = useCallback(() => {
    const filteredClickData = selectedUser === "all"
      ? clickData
      : clickData.filter((d) => d.user_id === selectedUser);

    const filteredByCompletion = showCompletedOnly
      ? filteredClickData.filter((d) => {
          const save = gameSaves.find((s) => s.user_id === d.user_id);
          return save?.game_state?.gameComplete;
        })
      : filteredClickData;

    const timeBuckets: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 24; i++) {
      timeBuckets[`${i}h`] = {};
    }

    if (filteredByCompletion.length === 0) {
      return Object.entries(timeBuckets).map(([time, clicks]) => ({ time, ...clicks }));
    }

    const firstClickTime = new Date(filteredByCompletion[0].timestamp).getTime();
    filteredByCompletion.forEach((entry) => {
      const elapsed = (new Date(entry.timestamp).getTime() - firstClickTime) / 1000;
      const bucket = Math.floor(elapsed / 3600);

      if (bucket >= 0 && bucket < 24) {
        const bucketKey = `${bucket}h`;
        Object.entries(entry.clicks).forEach(([playtime, clicks]) => {
          Object.entries(clicks as Record<string, number>).forEach(
            ([button, count]) => {
              const cleanedButton = cleanButtonName(button);
              if (selectedClickTypes.has(cleanedButton)) {
                if (!timeBuckets[bucketKey][cleanedButton])
                  timeBuckets[bucketKey][cleanedButton] = 0;
                timeBuckets[bucketKey][cleanedButton] += count;
              }
            },
          );
        });
      }
    });

    return Object.entries(timeBuckets)
      .map(([time, clicks]) => ({ time, ...clicks }))
      .sort((a, b) => parseInt(a.time) - parseInt(b.time));
  }, [clickData, gameSaves, selectedUser, showCompletedOnly, selectedClickTypes]);

  const getTotalClicksByButton = useCallback(() => {
    const filteredClickData = selectedUser === "all"
      ? clickData
      : clickData.filter((d) => d.user_id === selectedUser);

    const filteredByCompletion = showCompletedOnly
      ? filteredClickData.filter((d) => {
          const save = gameSaves.find((s) => s.user_id === d.user_id);
          return save?.game_state?.gameComplete;
        })
      : filteredClickData;

    const buttonTotals: Record<string, number> = {};
    filteredByCompletion.forEach((entry) => {
      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
        Object.entries(playtimeClicks).forEach(([button, count]) => {
          const cleanedButton = cleanButtonName(button);
          if (!buttonTotals[cleanedButton]) buttonTotals[cleanedButton] = 0;
          buttonTotals[cleanedButton] += count as number;
        });
      });
    });

    return Object.entries(buttonTotals)
      .map(([button, total]) => ({ button, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [clickData, gameSaves, selectedUser, showCompletedOnly]);

  const getAverageClicksByButton = useCallback(() => {
    const filteredClickData = selectedUser === "all"
      ? clickData
      : clickData.filter((d) => d.user_id === selectedUser);

    const filteredByCompletion = showCompletedOnly
      ? filteredClickData.filter((d) => {
          const save = gameSaves.find((s) => s.user_id === d.user_id);
          return save?.game_state?.gameComplete;
        })
      : filteredClickData;

    const buttonStats: Record<string, { total: number; users: Set<string> }> = {};
    filteredByCompletion.forEach((entry) => {
      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
        Object.entries(playtimeClicks).forEach(([button, count]) => {
          const cleanedButton = cleanButtonName(button);
          if (!buttonStats[cleanedButton])
            buttonStats[cleanedButton] = { total: 0, users: new Set() };
          buttonStats[cleanedButton].total += count as number;
          buttonStats[cleanedButton].users.add(entry.user_id);
        });
      });
    });

    return Object.entries(buttonStats)
      .map(([button, stats]) => ({
        button,
        average: stats.total / stats.users.size,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 15);
  }, [clickData, gameSaves, selectedUser, showCompletedOnly]);

  // All memos MUST be defined before conditional returns to comply with React rules
  const getStatsOverPlaytime = useMemo(() => {
    const relevant = filterByUser(gameSaves);
    if (relevant.length === 0) {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}h`,
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
      }));
    }

    const timeMap = new Map<number, { strength: number[], knowledge: number[], luck: number[], madness: number[] }>();
    for (let i = 0; i < 24; i++) {
      timeMap.set(i, { strength: [], knowledge: [], luck: [], madness: [] });
    }

    relevant.forEach((save) => {
      const clicksForUser = clickData.filter((c) => c.user_id === save.user_id);
      if (clicksForUser.length === 0) return;

      const firstClickTime = new Date(clicksForUser[0].timestamp).getTime();

      clicksForUser.forEach((click) => {
        const elapsed = (new Date(click.timestamp).getTime() - firstClickTime) / 1000;
        const bucket = Math.floor(elapsed / 3600);

        if (bucket >= 0 && bucket < 24) {
          const state = click.game_state_snapshot;
          if (state) {
            const data = timeMap.get(bucket)!;
            data.strength.push(state.strength || 0);
            data.knowledge.push(state.knowledge || 0);
            data.luck.push(state.luck || 0);
            data.madness.push(state.madness || 0);
          }
        }
      });
    });

    return Array.from({ length: 24 }, (_, i) => {
      const stats = timeMap.get(i)!;
      return {
        time: `${i}h`,
        strength: stats.strength.length > 0 ? stats.strength.reduce((a, b) => a + b, 0) / stats.strength.length : 0,
        knowledge: stats.knowledge.length > 0 ? stats.knowledge.reduce((a, b) => a + b, 0) / stats.knowledge.length : 0,
        luck: stats.luck.length > 0 ? stats.luck.reduce((a, b) => a + b, 0) / stats.luck.length : 0,
        madness: stats.madness.length > 0 ? stats.madness.reduce((a, b) => a + b, 0) / stats.madness.length : 0,
      };
    });
  }, [gameSaves, clickData, selectedUser, showCompletedOnly]);

  const getResourceStatsOverPlaytime = useMemo(() => {
    const relevant = filterByUser(gameSaves);
    const resourceKeys = ['food', 'wood', 'stone', 'iron', 'coal', 'sulfur', 'obsidian', 'adamant', 'moonstone', 'leather', 'steel', 'gold', 'silver'];

    if (relevant.length === 0) {
      return Array.from({ length: 24 }, (_, i) => {
        const result: any = { time: `${i}h` };
        resourceKeys.forEach(key => result[key] = 0);
        return result;
      });
    }

    const timeMap = new Map<number, { [key: string]: number[] }>();
    for (let i = 0; i < 24; i++) {
      const emptyData: { [key: string]: number[] } = {};
      resourceKeys.forEach(key => emptyData[key] = []);
      timeMap.set(i, emptyData);
    }

    relevant.forEach((save) => {
      const clicksForUser = clickData.filter((c) => c.user_id === save.user_id);
      if (clicksForUser.length === 0) return;

      const firstClickTime = new Date(clicksForUser[0].timestamp).getTime();

      clicksForUser.forEach((click) => {
        const elapsed = (new Date(click.timestamp).getTime() - firstClickTime) / 1000;
        const bucket = Math.floor(elapsed / 3600);

        if (bucket >= 0 && bucket < 24) {
          const state = click.game_state_snapshot?.resources;
          if (state) {
            const data = timeMap.get(bucket)!;
            resourceKeys.forEach(key => {
              data[key].push(state[key] || 0);
            });
          }
        }
      });
    });

    return Array.from({ length: 24 }, (_, i) => {
      const resources = timeMap.get(i)!;
      const result: any = { time: `${i}h` };
      resourceKeys.forEach(key => {
        result[key] = resources[key].length > 0 ? resources[key].reduce((a, b) => a + b, 0) / resources[key].length : 0;
      });
      return result;
    });
  }, [gameSaves, clickData, selectedUser, showCompletedOnly, selectedResources]);

  const getButtonUpgradesOverPlaytime = useMemo(() => {
    const relevant = filterByUser(gameSaves);
    if (relevant.length === 0) {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}h`,
        caveExplore: 1, mineStone: 1, mineIron: 1, mineCoal: 1, mineSulfur: 1, mineObsidian: 1, mineAdamant: 1, hunt: 1, chopWood: 1,
      }));
    }

    const timeMap = new Map<number, { caveExplore: number[], mineStone: number[], mineIron: number[], mineCoal: number[], mineSulfur: number[], mineObsidian: number[], mineAdamant: number[], hunt: number[], chopWood: number[] }>();
    for (let i = 0; i < 24; i++) {
      timeMap.set(i, { caveExplore: [], mineStone: [], mineIron: [], mineCoal: [], mineSulfur: [], mineObsidian: [], mineAdamant: [], hunt: [], chopWood: [] });
    }

    relevant.forEach((save) => {
      const clicksForUser = clickData.filter((c) => c.user_id === save.user_id);
      if (clicksForUser.length === 0) return;

      const firstClickTime = new Date(clicksForUser[0].timestamp).getTime();

      clicksForUser.forEach((click) => {
        const elapsed = (new Date(click.timestamp).getTime() - firstClickTime) / 1000;
        const bucket = Math.floor(elapsed / 3600);

        if (bucket >= 0 && bucket < 24) {
          const state = click.game_state_snapshot;
          if (state?.buttonLevels) {
            const data = timeMap.get(bucket)!;
            data.caveExplore.push(state.buttonLevels.caveExplore || 1);
            data.mineStone.push(state.buttonLevels.mineStone || 1);
            data.mineIron.push(state.buttonLevels.mineIron || 1);
            data.mineCoal.push(state.buttonLevels.mineCoal || 1);
            data.mineSulfur.push(state.buttonLevels.mineSulfur || 1);
            data.mineObsidian.push(state.buttonLevels.mineObsidian || 1);
            data.mineAdamant.push(state.buttonLevels.mineAdamant || 1);
            data.hunt.push(state.buttonLevels.hunt || 1);
            data.chopWood.push(state.buttonLevels.chopWood || 1);
          }
        }
      });
    });

    return Array.from({ length: 24 }, (_, i) => {
      const levels = timeMap.get(i)!;
      return {
        time: `${i}h`,
        caveExplore: levels.caveExplore.length > 0 ? levels.caveExplore.reduce((a, b) => a + b, 0) / levels.caveExplore.length : 1,
        mineStone: levels.mineStone.length > 0 ? levels.mineStone.reduce((a, b) => a + b, 0) / levels.mineStone.length : 1,
        mineIron: levels.mineIron.length > 0 ? levels.mineIron.reduce((a, b) => a + b, 0) / levels.mineIron.length : 1,
        mineCoal: levels.mineCoal.length > 0 ? levels.mineCoal.reduce((a, b) => a + b, 0) / levels.mineCoal.length : 1,
        mineSulfur: levels.mineSulfur.length > 0 ? levels.mineSulfur.reduce((a, b) => a + b, 0) / levels.mineSulfur.length : 1,
        mineObsidian: levels.mineObsidian.length > 0 ? levels.mineObsidian.reduce((a, b) => a + b, 0) / levels.mineObsidian.length : 1,
        mineAdamant: levels.mineAdamant.length > 0 ? levels.mineAdamant.reduce((a, b) => a + b, 0) / levels.mineAdamant.length : 1,
        hunt: levels.hunt.length > 0 ? levels.hunt.reduce((a, b) => a + b, 0) / levels.hunt.length : 1,
        chopWood: levels.chopWood.length > 0 ? levels.chopWood.reduce((a, b) => a + b, 0) / levels.chopWood.length : 1,
      };
    });
  }, [gameSaves, clickData, selectedUser, showCompletedOnly]);

  const getGameCompletionStats = useCallback(() => {
    const relevantSaves = selectedUser === "all"
      ? gameSaves
      : gameSaves.filter((s) => s.user_id === selectedUser);

    let completedCount = 0;
    let notCompletedCount = 0;

    relevantSaves.forEach(save => {
      const isCompleted = save.game_state?.events?.cube15a ||
                          save.game_state?.events?.cube15b ||
                          save.game_state?.events?.cube13 ||
                          save.game_state?.events?.cube14a ||
                          save.game_state?.events?.cube14b ||
                          save.game_state?.events?.cube14c ||
                          save.game_state?.events?.cube14d ||
                          save.game_state?.gameComplete;

      if (isCompleted) {
        completedCount++;
      } else {
        notCompletedCount++;
      }
    });

    return [
      { name: "Completed", value: completedCount },
      { name: "Not Completed", value: notCompletedCount },
    ];
  }, [gameSaves, selectedUser]);

  const getDailyPurchases = useCallback(() => {
    const data: Array<{ day: string; purchases: number }> = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dailyPurchases = purchases.filter((purchase) => {
        const purchaseDate = parseISO(purchase.purchased_at);
        return purchaseDate >= dayStart && purchaseDate <= dayEnd && purchase.price_paid > 0 && !purchase.bundle_id;
      }).length;

      data.push({
        day: format(date, "MMM dd"),
        purchases: dailyPurchases,
      });
    }

    return data;
  }, [purchases]);

  const getPurchasesByPlaytime = useCallback(() => {
    const playtimeBuckets = new Map<number, number>();
    let maxBucket = 0;

    purchases.filter((p) => p.price_paid > 0 && !p.bundle_id).forEach((purchase) => {
      const save = gameSaves.find((s) => s.user_id === purchase.user_id);
      if (save) {
        const playTimeMinutes = save.game_state?.playTime
          ? Math.round(save.game_state.playTime / 60000)
          : 0;
        const bucket = Math.floor(playTimeMinutes / 60);
        maxBucket = Math.max(maxBucket, bucket);
        playtimeBuckets.set(bucket, (playtimeBuckets.get(bucket) || 0) + 1);
      }
    });

    const result: Array<{ playtime: string; purchases: number }> = [];
    for (let bucket = 0; bucket <= maxBucket; bucket++) {
      result.push({
        playtime: `${bucket}h`,
        purchases: playtimeBuckets.get(bucket) || 0,
      });
    }

    return result;
  }, [purchases, gameSaves]);

  const getPurchaseStats = useCallback(() => {
    const itemCounts = new Map<string, number>();

    purchases.filter((p) => !p.bundle_id).forEach((purchase) => {
      itemCounts.set(
        purchase.item_name,
        (itemCounts.get(purchase.item_name) || 0) + 1
      );
    });

    return Array.from(itemCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [purchases]);

  const getTotalReferrals = useCallback(() => {
    return gameSaves.reduce((sum, save) => {
      return sum + (save.game_state?.referrals?.length || 0);
    }, 0);
  }, [gameSaves]);

  const getDailyReferrals = useCallback(() => {
    const data: Array<{ day: string; referrals: number }> = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dailyReferrals = gameSaves.reduce((sum, save) => {
        const referrals = save.game_state?.referrals || [];
        return sum + referrals.filter((ref: any) => {
          const timestamp = ref.timestamp || ref.created_at;
          if (!timestamp || typeof timestamp !== 'string') return false;
          try {
            const refDate = parseISO(timestamp);
            return refDate >= dayStart && refDate <= dayEnd;
          } catch {
            return false;
          }
        }).length;
      }, 0);

      data.push({
        day: format(date, "MMM dd"),
        referrals: dailyReferrals,
      });
    }

    return data;
  }, [gameSaves]);

  const getTopReferrers = useCallback(() => {
    const referrerCounts = new Map<string, number>();

    gameSaves.forEach((save) => {
      const referrals = save.game_state?.referrals || [];
      if (referrals.length > 0) {
        referrerCounts.set(
          save.user_id.substring(0, 8) + "...",
          referrals.length
        );
      }
    });

    return Array.from(referrerCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [gameSaves]);

  const getSleepUpgradesDistribution = useCallback(() => {
    const filteredSaves = selectedUser === "all"
      ? gameSaves
      : gameSaves.filter((s) => s.user_id === selectedUser);

    const completedSaves = showCompletedOnly
      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
      : filteredSaves;

    const distribution = new Map<number, { lengthUsers: number; intensityUsers: number }>();

    completedSaves.forEach((save) => {
      const lengthLevel = save.game_state?.sleepUpgrades?.lengthLevel || 0;
      const intensityLevel = save.game_state?.sleepUpgrades?.intensityLevel || 0;

      if (!distribution.has(lengthLevel)) {
        distribution.set(lengthLevel, { lengthUsers: 0, intensityUsers: 0 });
      }
      distribution.get(lengthLevel)!.lengthUsers++;

      if (!distribution.has(intensityLevel)) {
        distribution.set(intensityLevel, { lengthUsers: 0, intensityUsers: 0 });
      }
      distribution.get(intensityLevel)!.intensityUsers++;
    });

    const maxLevel = Math.max(...Array.from(distribution.keys()), 0);
    const result = [];

    for (let i = 0; i <= maxLevel; i++) {
      const stats = distribution.get(i) || { lengthUsers: 0, intensityUsers: 0 };
      result.push({
        level: `Level ${i}`,
        lengthUsers: stats.lengthUsers,
        intensityUsers: stats.intensityUsers,
      });
    }

    return result;
  }, [gameSaves, selectedUser, showCompletedOnly]);

  const checkAdminAccess = async () => {
    try {
      const supabase = await getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const adminEmails = getAdminEmails();

      if (!user || !adminEmails.includes(user.email || "")) {
        setLoading(false);
        setLocation("/");
        return;
      }

      setIsAuthorized(true);
      await loadData();
      setLoading(false);
    } catch (error) {
      logger.error("Auth check failed:", error);
      setLoading(false);
      setLocation("/");
    }
  };

  // Renamed from loadDashboardData to loadData
  const loadData = async () => {
    try {
      const response = await fetch(`/api/admin/data?env=${environment}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Admin data fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch admin data: ${response.status}`);
      }

      const data = await response.json();

      // Set the raw data (will be filtered by timeRange useMemo)
      if (data.clicks) {
        setRawClickData(data.clicks);
      }
      if (data.saves) {
        setRawGameSaves(data.saves);
      }
      if (data.purchases) {
        setRawPurchases(data.purchases);
      }
      if (data.dau) {
        setDauData(data.dau);
      }
      if (typeof data.totalUserCount === 'number') {
        setTotalUserCount(data.totalUserCount);
      }
      if (data.emailConfirmationStats) {
        setEmailConfirmationStats(data.emailConfirmationStats);
      }

      // Collect unique user IDs only from users who have click data
      const userIdsWithClicks = new Set<string>();
      data.clicks?.forEach((c: any) => userIdsWithClicks.add(c.user_id));

      const userList = Array.from(userIdsWithClicks).map((id) => ({
        id,
        email: id.substring(0, 8) + "...",
      }));

      setUsers(userList);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error("Failed to load admin data:", error);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088FE",
    "#00C49F",
  ];

  const handleLookupUser = async () => {
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const queryParam = lookupType === "id" ? "userId" : "email";
      const response = await fetch(
        `/api/admin/user-lookup?${queryParam}=${encodeURIComponent(lookupUserId)}&env=${environment}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch user data");
      }

      const data = await response.json();

      if (!data.save) {
        setLookupError(`No save game found for this ${lookupType === "id" ? "user ID" : "email"}`);
      } else {
        setLookupResult(data.save);
      }
    } catch (error: any) {
      logger.error("User lookup failed:", error);
      setLookupError(error.message || "Failed to lookup user");
    } finally {
      setLookupLoading(false);
    }
  };

  // Helper function to get playtime bucket label for session length (0-24 hours in 1-hour steps)
  const getBucketLabel = (playTimeMinutes: number): string => {
    const hours = Math.floor(playTimeMinutes / 60);
    if (hours >= 24) return "24h+";
    return `${hours}h`;
  };

  // Get clicks and purchases for looked up user
  const getLookupUserClicks = () => {
    if (!lookupResult) return [];
    return clickData.filter((c) => c.user_id === lookupResult.user_id);
  };

  const getLookupUserPurchases = () => {
    if (!lookupResult) return [];
    return purchases.filter((p) => p.user_id === lookupResult.user_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto h-full p-8">
        <ScrollArea className="h-full">
          <div className="space-y-8 pr-4">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              <div className="flex gap-4">
                <Select
                  value={environment}
                  onValueChange={(value: "dev" | "prod") =>
                    setEnvironment(value)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={timeRange}
                  onValueChange={(value: "1d" | "3d" | "7d" | "30d" | "all") =>
                    setTimeRange(value)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 Hours</SelectItem>
                    <SelectItem value="3d">Last 3 Days</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
                <TabsTrigger value="clicks">Button Clicks</TabsTrigger>
                <TabsTrigger value="completion">Game Progress</TabsTrigger>
                <TabsTrigger value="purchases">Purchases</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
                <TabsTrigger value="churn">Churn</TabsTrigger>
                <TabsTrigger value="sleep">Sleep Upgrades</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="upgrades">Button Upgrades</TabsTrigger>
                <TabsTrigger value="lookup">User Lookup</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab
                  rawGameSaves={rawGameSaves}
                  getDailyActiveUsers={() => {
                    const now = new Date();
                    const oneDayAgo = subDays(now, 1);
                    // Using filtered gameSaves for consistency
                    return gameSaves.filter(
                      (s) => parseISO(s.updated_at) >= oneDayAgo
                    ).length;
                  }}
                  getWeeklyActiveUsers={() => {
                    const now = new Date();
                    const sevenDaysAgo = subDays(now, 7);
                    return gameSaves.filter(
                      (s) => parseISO(s.updated_at) >= sevenDaysAgo
                    ).length;
                  }}
                  getMonthlyActiveUsers={() => {
                    const now = new Date();
                    const thirtyDaysAgo = subDays(now, 30);
                    return gameSaves.filter(
                      (s) => parseISO(s.updated_at) >= thirtyDaysAgo
                    ).length;
                  }}
                  totalUserCount={totalUserCount}
                  gameSaves={gameSaves}
                  emailConfirmationStats={emailConfirmationStats}
                  formatTime={formatTime}
                  getAveragePlaytime={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    if (completedSaves.length === 0) return 0;

                    const totalPlayTime = completedSaves.reduce(
                      (sum, save) => sum + (save.game_state?.playTime || 0),
                      0,
                    );
                    return Math.floor(totalPlayTime / completedSaves.length / 60000);
                  }}
                  getAveragePlaytimeToCompletion={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = filteredSaves.filter(
                      (s) =>
                        s.game_state?.events?.cube15a ||
                        s.game_state?.events?.cube15b ||
                        s.game_state?.events?.cube13 ||
                        s.game_state?.events?.cube14a ||
                        s.game_state?.events?.cube14b ||
                        s.game_state?.events?.cube14c ||
                        s.game_state?.events?.cube14d,
                    );

                    if (completedSaves.length === 0) return 0;

                    const totalPlayTime = completedSaves.reduce(
                      (sum, save) => sum + (save.game_state?.playTime || 0),
                      0,
                    );
                    return Math.floor(totalPlayTime / completedSaves.length / 60000);
                  }}
                  getConversionRate={() => {
                    const paidPurchases = rawPurchases.filter(
                      (p) => p.price_paid > 0 && !p.bundle_id
                    );
                    const uniqueBuyers = new Set(paidPurchases.map((p) => p.user_id));
                    return totalUserCount > 0
                      ? Math.round((uniqueBuyers.size / totalUserCount) * 100)
                      : 0;
                  }}
                  getBuyersPerHundred={() => {
                    const paidPurchases = rawPurchases.filter(
                      (p) => p.price_paid > 0 && !p.bundle_id
                    );
                    const uniqueBuyers = new Set(paidPurchases.map((p) => p.user_id));
                    return totalUserCount > 0
                      ? ((uniqueBuyers.size / totalUserCount) * 100).toFixed(2)
                      : "0.00";
                  }}
                  getARPU={() => {
                    const totalRevenue = rawPurchases
                      .filter((p) => p.price_paid > 0 && !p.bundle_id)
                      .reduce((sum, p) => sum + p.price_paid, 0);
                    return totalUserCount > 0
                      ? (totalRevenue / totalUserCount).toFixed(2)
                      : "0.00";
                  }}
                  getTotalRevenue={() =>
                    rawPurchases
                      .filter((p) => p.price_paid > 0 && !p.bundle_id)
                      .reduce((sum, p) => sum + p.price_paid, 0)
                  }
                  getInstagramFollowers={() => {
                    return gameSaves.filter((s) => s.game_state?.instagramFollow).length;
                  }}
                  getInstagramFollowRate={() => {
                    const followers = gameSaves.filter((s) => s.game_state?.instagramFollow).length;
                    return totalUserCount > 0
                      ? ((followers / totalUserCount) * 100).toFixed(2)
                      : "0.00";
                  }}
                  getUserRetention={() => {
                    const data: Array<{ day: string; users: number }> = [];
                    const now = new Date();

                    for (let i = 29; i >= 0; i--) {
                      const date = subDays(now, i);
                      const dayStart = startOfDay(date);
                      const dayEnd = endOfDay(date);

                      const activeUsers = rawGameSaves.filter((save) => { // Use raw for historical accuracy
                        const activityDate = parseISO(save.updated_at);
                        return activityDate >= dayStart && activityDate <= dayEnd;
                      }).length;

                      data.push({
                        day: format(date, "MMM dd"),
                        users: activeUsers,
                      });
                    }

                    return data;
                  }}
                  getDailySignups={() => {
                    const data: Array<{ day: string; signups: number }> = [];
                    const now = new Date();

                    for (let i = 29; i >= 0; i--) {
                      const date = subDays(now, i);
                      const dayStart = startOfDay(date);
                      const dayEnd = endOfDay(date);

                      const signups = rawGameSaves.filter((save) => { // Use raw for historical accuracy
                        const createdDate = parseISO(save.created_at);
                        return createdDate >= dayStart && createdDate <= dayEnd;
                      }).length;

                      data.push({
                        day: format(date, "MMM dd"),
                        signups,
                      });
                    }

                    return data;
                  }}
                  getHourlySignups={() => {
                    const data: Array<{ hour: string; signups: number }> = [];
                    const now = new Date();
                    const oneDayAgo = subDays(now, 1);

                    for (let i = 23; i >= 0; i--) { // Corrected loop for 24 hours
                      const hour = new Date(now);
                      hour.setHours(now.getHours() - i, 0, 0, 0);
                      const nextHour = new Date(hour);
                      nextHour.setHours(hour.getHours() + 1);

                      const signups = rawGameSaves.filter((save) => { // Use raw for historical accuracy
                        const createdDate = parseISO(save.created_at);
                        return createdDate >= hour && createdDate < nextHour && createdDate >= oneDayAgo;
                      }).length;

                      data.push({
                        hour: format(hour, "HH:mm"),
                        signups,
                      });
                    }

                    return data.reverse(); // Ensure chronological order
                  }}
                />
              </TabsContent>

              <TabsContent value="engagement">
                <EngagementTab
                  getSessionLengthDistribution={() => {
                    const buckets: Record<string, number> = {};
                    for (let i = 0; i < 24; i++) {
                      buckets[`${i}h`] = 0;
                    }
                    buckets["24h+"] = 0;

                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    completedSaves.forEach((save) => {
                      const playTime = save.game_state?.playTime || 0;
                      const playTimeMinutes = Math.floor(playTime / 60000);
                      const bucket = getBucketLabel(playTimeMinutes);
                      buckets[bucket]++;
                    });

                    return Object.entries(buckets).map(([range, count]) => ({
                      range,
                      count,
                    }));
                  }}
                  getAveragePlaytime={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    if (completedSaves.length === 0) return 0;

                    const totalPlayTime = completedSaves.reduce(
                      (sum, save) => sum + (save.game_state?.playTime || 0),
                      0,
                    );
                    return Math.floor(totalPlayTime / completedSaves.length / 60000);
                  }}
                  getAveragePlaytimeToCompletion={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = filteredSaves.filter(
                      (s) =>
                        s.game_state?.events?.cube15a ||
                        s.game_state?.events?.cube15b ||
                        s.game_state?.events?.cube13 ||
                        s.game_state?.events?.cube14a ||
                        s.game_state?.events?.cube14b ||
                        s.game_state?.events?.cube14c ||
                        s.game_state?.events?.cube14d,
                    );

                    if (completedSaves.length === 0) return 0;

                    const totalPlayTime = completedSaves.reduce(
                      (sum, save) => sum + (save.game_state?.playTime || 0),
                      0,
                    );
                    return Math.floor(totalPlayTime / completedSaves.length / 60000);
                  }}
                  formatTime={formatTime}
                />
              </TabsContent>

              <TabsContent value="clicks">
                <ClicksTab
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  selectedClickTypes={selectedClickTypes}
                  setSelectedClickTypes={setSelectedClickTypes}
                  getAllButtonNames={() => {
                    const buttonNames = new Set<string>();
                    clickData.forEach((entry) => { // Use filtered clickData
                      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
                        Object.keys(playtimeClicks).forEach((button) => {
                          buttonNames.add(cleanButtonName(button));
                        });
                      });
                    });
                    return Array.from(buttonNames);
                  }}
                  getButtonClicksOverTime={getButtonClicksOverTime}
                  getClickTypesByTimestamp={getClickTypesByTimestamp}
                  getTotalClicksByButton={getTotalClicksByButton}
                  getAverageClicksByButton={getAverageClicksByButton}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="completion">
                <CompletionTab
                  gameSaves={gameSaves}
                  getGameCompletionStats={getGameCompletionStats}
                  totalUserCount={totalUserCount}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="purchases">
                <PurchasesTab
                  purchases={purchases}
                  getTotalRevenue={() =>
                    rawPurchases // Use raw for total revenue
                      .filter((p) => p.price_paid > 0 && !p.bundle_id)
                      .reduce((sum, p) => sum + p.price_paid, 0)
                  }
                  getDailyPurchases={getDailyPurchases}
                  getPurchasesByPlaytime={getPurchasesByPlaytime}
                  getPurchaseStats={getPurchaseStats}
                />
              </TabsContent>

              <TabsContent value="referrals">
                <ReferralsTab
                  gameSaves={gameSaves}
                  getTotalReferrals={getTotalReferrals}
                  getDailyReferrals={getDailyReferrals}
                  getTopReferrers={getTopReferrers}
                />
              </TabsContent>

              <TabsContent value="churn">
                <ChurnTab
                  gameSaves={gameSaves}
                  clickData={clickData}
                  churnDays={churnDays}
                  setChurnDays={setChurnDays}
                  selectedCubeEvents={selectedCubeEvents}
                  setSelectedCubeEvents={setSelectedCubeEvents}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="sleep">
                <SleepTab
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  getSleepUpgradesDistribution={getSleepUpgradesDistribution}
                />
              </TabsContent>

              <TabsContent value="resources">
                <ResourcesTab
                  clickData={clickData}
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  selectedStats={selectedStats}
                  setSelectedStats={setSelectedStats}
                  selectedResources={selectedResources}
                  setSelectedResources={setSelectedResources}
                  getStatsOverPlaytime={getStatsOverPlaytime}
                  getResourceStatsOverPlaytime={getResourceStatsOverPlaytime}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="upgrades">
                <UpgradesTab
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  selectedMiningTypes={selectedMiningTypes}
                  setSelectedMiningTypes={setSelectedMiningTypes}
                  getButtonUpgradesOverPlaytime={getButtonUpgradesOverPlaytime}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="lookup">
                <LookupTab
                  environment={environment}
                  lookupUserId={lookupUserId}
                  setLookupUserId={setLookupUserId}
                  lookupType={lookupType}
                  setLookupType={setLookupType}
                  lookupLoading={lookupLoading}
                  lookupError={lookupError}
                  lookupResult={lookupResult}
                  handleLookupUser={handleLookupUser}
                  getLookupUserClicks={getLookupUserClicks}
                  getLookupUserPurchases={getLookupUserPurchases}
                  formatTime={formatTime}
                />
              </TabsContent>
            </Tabs>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}