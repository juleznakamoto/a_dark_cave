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
  resources?: Record<string, number>; // Added for resources at the time of click
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
      Promise.all([loadData(), loadDauData()]).finally(() => setLoading(false));
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

    // Process clicks using the playtime keys already in the data
    filteredByCompletion.forEach((entry) => {
      // entry.clicks is structured as: { "playtime_minutes": { "button_name": count } }
      Object.entries(entry.clicks).forEach(([playtimeKey, buttonClicks]) => {
        // playtimeKey is in minutes, convert to hours
        const playtimeMinutes = parseInt(playtimeKey);
        if (isNaN(playtimeMinutes)) return;

        const bucket = Math.floor(playtimeMinutes / 60);

        if (bucket >= 0 && bucket < 24) {
          const bucketKey = `${bucket}h`;
          const clickCount = Object.values(buttonClicks as Record<string, number>).reduce(
            (sum, count) => sum + count,
            0
          );
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

    // Process clicks using the playtime keys already in the data
    filteredByCompletion.forEach((entry) => {
      Object.entries(entry.clicks).forEach(([playtimeKey, buttonClicks]) => {
        const playtimeMinutes = parseInt(playtimeKey);
        if (isNaN(playtimeMinutes)) return;

        const bucket = Math.floor(playtimeMinutes / 60);

        if (bucket >= 0 && bucket < 24) {
          const bucketKey = `${bucket}h`;
          Object.entries(buttonClicks as Record<string, number>).forEach(
            ([button, count]) => {
              const cleanedButton = cleanButtonName(button);
              if (selectedClickTypes.has(cleanedButton)) {
                if (!timeBuckets[bucketKey][cleanedButton])
                  timeBuckets[bucketKey][cleanedButton] = 0;
                timeBuckets[bucketKey][cleanedButton] += count;
              }
            },
          );
        }
      });
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
    filteredClickData.forEach((entry) => {
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
    const relevantSaves = selectedUser === "all"
      ? gameSaves
      : gameSaves.filter((s) => s.user_id === selectedUser);

    if (relevantSaves.length === 0) {
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

    // Use the final game state stats from each user's save
    relevantSaves.forEach((save) => {
      if (!save.game_state?.stats) return;

      const stats = save.game_state.stats;
      const playTimeMinutes = save.game_state.playTime ? Math.floor(save.game_state.playTime / 60000) : 0;
      const bucket = Math.floor(playTimeMinutes / 60);

      if (bucket >= 0 && bucket < 24) {
        const data = timeMap.get(bucket)!;
        if (selectedStats.has('strength')) data.strength.push(stats.strength || 0);
        if (selectedStats.has('knowledge')) data.knowledge.push(stats.knowledge || 0);
        if (selectedStats.has('luck')) data.luck.push(stats.luck || 0);
        if (selectedStats.has('madness')) data.madness.push(stats.madness || 0);
      }
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
  }, [gameSaves, selectedUser, selectedStats]);

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

    // Use the final game state resources from each user's save
    relevant.forEach((save) => {
      if (!save.game_state?.resources) return;

      const resources = save.game_state.resources;
      const playTimeMinutes = save.game_state.playTime ? Math.floor(save.game_state.playTime / 60000) : 0;
      const bucket = Math.floor(playTimeMinutes / 60);

      if (bucket >= 0 && bucket < 24) {
        const data = timeMap.get(bucket)!;
        resourceKeys.forEach(key => {
          if (selectedResources.has(key)) {
            data[key].push(resources[key] || 0);
          }
        });
      }
    });

    return Array.from({ length: 24 }, (_, i) => {
      const resources = timeMap.get(i)!;
      const result: any = { time: `${i}h` };
      resourceKeys.forEach(key => {
        result[key] = resources[key].length > 0 ? resources[key].reduce((a, b) => a + b, 0) / resources[key].length : 0;
      });
      return result;
    });
  }, [gameSaves, selectedUser, selectedResources]);

  const getButtonUpgradesOverPlaytime = useCallback(async () => {
    if (!getSupabaseClient()) return [];

    const { data: clickData, error } = await getSupabaseClient()
      .from("click_analytics")
      .select("user_id, clicks")
      .eq("environment", environment)
      .not("clicks", "is", null)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) {
      console.error("📦 Error fetching click data:", error);
      return [];
    }

    console.log(
      "⬆️ getButtonUpgradesOverPlaytime - clickData length:",
      clickData?.length,
    );

    if (!clickData || clickData.length === 0) {
      console.log("📦 No relevant saves, returning empty data");
      return [];
    }

    // Group by user and aggregate all their clicks
    const userClickMaps = new Map<
      string,
      Record<string, Record<string, number>>
    >();

    clickData.forEach((save) => {
      const userId = save.user_id;
      const clicks = save.clicks as Record<string, Record<string, number>>;

      if (!clicks || typeof clicks !== "object") {
        return;
      }

      if (!userClickMaps.has(userId)) {
        userClickMaps.set(userId, clicks);
      } else {
        // Merge clicks for the same user
        const existingClicks = userClickMaps.get(userId)!;
        Object.entries(clicks).forEach(([timeBucket, actions]) => {
          if (!existingClicks[timeBucket]) {
            existingClicks[timeBucket] = {};
          }
          Object.entries(actions).forEach(([action, count]) => {
            existingClicks[timeBucket][action] =
              (existingClicks[timeBucket][action] || 0) + count;
          });
        });
      }
    });

    console.log(
      `⬆️ Processing ${userClickMaps.size} unique users with clicks`,
    );

    // Now process all users' data
    const timeBuckets = new Map<
      string,
      { mineStone: number; hunt: number; chopWood: number; caveExplore: number }
    >();
    for (let i = 0; i < 24; i++) {
      timeBuckets.set(`${i}h`, {
        mineStone: 0,
        hunt: 0,
        chopWood: 0,
        caveExplore: 0,
      });
    }

    userClickMaps.forEach((userClicks) => {
      Object.entries(userClicks).forEach(([timeBucket, actions]) => {
        const bucketNumber = parseInt(timeBucket);
        if (isNaN(bucketNumber) || bucketNumber < 0 || bucketNumber >= 24) return;

        const bucketKey = `${bucketNumber}h`;
        if (!timeBuckets.has(bucketKey)) {
           timeBuckets.set(bucketKey, {
            mineStone: 0,
            hunt: 0,
            chopWood: 0,
            caveExplore: 0,
          });
        }
        const bucket = timeBuckets.get(bucketKey)!;

        // Map action IDs to our chart categories
        Object.entries(actions).forEach(([actionId, count]) => {
          if (selectedMiningTypes.has('mineStone') && actionId === "mineStone") {
            bucket.mineStone += count;
          } else if (selectedMiningTypes.has('hunt') && actionId === "hunt") {
            bucket.hunt += count;
          } else if (selectedMiningTypes.has('chopWood') && actionId === "chopWood") {
            bucket.chopWood += count;
          } else if (selectedMiningTypes.has('caveExplore') && (actionId === "exploreCave" || actionId === "ventureDeeper" || actionId === "descendFurther" || actionId === "exploreRuins" || actionId === "exploreTemple" || actionId === "exploreCitadel")) {
            bucket.caveExplore += count;
          }
        });
      });
    });

    // Convert to array and sort by time
    const result = Array.from(timeBuckets.entries())
      .map(([time, data]) => ({
        time,
        ...data,
      }))
      .sort((a, b) => {
        const aMinutes = parseInt(a.time);
        const bMinutes = parseInt(b.time);
        return aMinutes - bMinutes;
      });

    console.log(
      "⬆️ getButtonUpgradesOverPlaytime result (first 3 buckets):",
      result.slice(0, 3),
    );

    return result;
  }, [getSupabaseClient, environment, selectedMiningTypes]);

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

  const loadDauData = async () => {
    try {
      const response = await fetch(`/api/admin/dau?env=${environment}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("DAU data fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch DAU data: ${response.status}`);
      }

      const data = await response.json();
      if (data.dau) {
        setDauData(data.dau);
      }
    } catch (error) {
      logger.error("Failed to load DAU data:", error);
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
        console.log('📥 Loading click data:', data.clicks.length, 'entries');
        if (data.clicks.length > 0) {
          console.log('📥 Sample click entry:', data.clicks[0]);
          console.log('📥 Click has game_state_snapshot:', !!data.clicks[0].game_state_snapshot);
          console.log('📥 Click has resources:', !!data.clicks[0].resources); // Added logging for resources
        }
        setRawClickData(data.clicks);
      }
      if (data.saves) {
        console.log('📥 Loading game saves:', data.saves.length, 'entries');
        setRawGameSaves(data.saves);
      }
      if (data.purchases) {
        setRawPurchases(data.purchases);
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
                  dailyActiveUsersData={dauData}
                  getDailyActiveUsers={() => {
                    if (dauData.length > 0) {
                      // Get the most recent DAU count
                      return dauData[0].active_user_count;
                    }
                    // Fallback to calculation if no DAU data
                    const now = new Date();
                    const oneDayAgo = subDays(now, 1);
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
                  dauData={dauData}
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
                  getGameCompletionStats={getGameCompletionStats()}
                  totalUserCount={totalUserCount}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="purchases">
                <PurchasesTab
                  purchases={purchases}
                  getTotalRevenue={() =>
                    rawPurchases
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
                  getTotalReferrals={getTotalReferrals}
                  gameSaves={gameSaves}
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
                  getSleepUpgradesDistribution={getSleepUpgradesDistribution()}
                />
              </TabsContent>

              <TabsContent value="resources">
                <ResourcesTab
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  selectedStats={selectedStats}
                  setSelectedStats={setSelectedStats}
                  selectedResources={selectedResources}
                  setSelectedResources={setSelectedResources}
                  statsOverPlaytime={getStatsOverPlaytime}
                  resourceStatsOverPlaytime={getResourceStatsOverPlaytime}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="upgrades">
                <UpgradesTab
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  selectedMiningTypes={selectedMiningTypes}
                  setSelectedMiningTypes={setSelectedMiningTypes}
                  buttonUpgradesOverPlaytime={getButtonUpgradesOverPlaytime}
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