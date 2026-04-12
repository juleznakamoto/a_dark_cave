import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { adminUnifiedRevenueEurCents } from "@shared/purchaseRevenueEur";
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
  startOfDay,
  endOfDay,
  format,
  parseISO,
} from "date-fns";
import {
  ADMIN_OVERVIEW_CHART_DAYS,
  ADMIN_TWELVE_MONTH_CHART_DAYS,
  type AdminOverviewChartRange,
  type AdminTwelveMonthChartRange,
} from "./adminChartTimeRange";

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
import SessionsTab from "./tabs/SessionsTab";

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
  bundle_id?: string;
  country?: string;
  cruel_mode?: boolean | null;
  /** Stripe charge currency (eur|usd); legacy rows treated as eur. */
  currency?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_fx_quote_id?: string | null;
  reporting_eur_cents?: number | null;
  reporting_usd_cents?: number | null;
}

interface AuthSignupData {
  id: string;
  created_at: string;
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

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states (raw, unfiltered)
  const [rawClickData, setRawClickData] = useState<ButtonClickData[]>([]);
  const [rawGameSaves, setRawGameSaves] = useState<GameSaveData[]>([]);
  const [rawPurchases, setRawPurchases] = useState<PurchaseData[]>([]);
  const [rawAuthSignups, setRawAuthSignups] = useState<AuthSignupData[]>([]);
  const [totalUserCount, setTotalUserCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date()); // State to track last data update
  const [dauData, setDauData] = useState<Array<{ date: string; active_user_count: number }>>([]);
  const [currentDau, setCurrentDau] = useState<number>(0);
  const [currentWau, setCurrentWau] = useState<number>(0);
  const [currentMau, setCurrentMau] = useState<number>(0);
  const [dailySignupsData, setDailySignupsData] = useState<Array<{ day: string; signups: number }>>([]);
  const [hourlySignupsData, setHourlySignupsData] = useState<Array<{ hour_start: string; signups: number }>>([]);
  const [registrationMethodStats, setRegistrationMethodStats] = useState<any>({
    emailRegistrations: 0,
    googleRegistrations: 0,
  });

  const [marketingMetrics, setMarketingMetrics] = useState<{
    marketingUsersPrompted: number;
    marketingUsersOptedIn: number;
    marketingOptInRate: number;
  }>({
    marketingUsersPrompted: 0,
    marketingUsersOptedIn: 0,
    marketingOptInRate: 0,
  });

  const [accountsDeletedAnonymized, setAccountsDeletedAnonymized] =
    useState(0);
  /** From DB RPC `admin_purchase_metrics`; avoids PostgREST row caps on raw rows. */
  const [purchaseMetrics, setPurchaseMetrics] = useState<{
    totalRevenueEurUnifiedCents: number | null;
    paidBuyerCount: number;
  } | null>(null);
  const [resendCsvBusy, setResendCsvBusy] = useState<
    null | "marketing" | "no-marketing"
  >(null);

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
    new Set(["caveExplore", "mineStone", "mineIron", "mineCoal", "mineSulfur", "mineObsidian", "mineAdamant", "hunt", "chopWood"]),
  );

  // State for selected cube events
  const [selectedCubeEvents, setSelectedCubeEvents] = useState<Set<string>>(new Set());

  // Overview tab: each chart has its own range (avoid coupling conversion / DAU / sign-ups / revenue charts)
  const [dauChartTimeRange, setDauChartTimeRange] = useState<AdminOverviewChartRange>("1m");
  const [dailySignupsChartTimeRange, setDailySignupsChartTimeRange] =
    useState<AdminOverviewChartRange>("1m");
  const [buyersPerHundredChartTimeRange, setBuyersPerHundredChartTimeRange] =
    useState<AdminOverviewChartRange>("1m");
  const [gainPerHundredChartTimeRange, setGainPerHundredChartTimeRange] =
    useState<AdminOverviewChartRange>("1m");

  const [purchasesChartTimeRange, setPurchasesChartTimeRange] =
    useState<AdminTwelveMonthChartRange>("1m");

  const [referralsChartTimeRange, setReferralsChartTimeRange] =
    useState<AdminTwelveMonthChartRange>("1m");

  // Full history for the selected environment (per-tab chart dropdowns still window their own series)
  const clickData = rawClickData;
  const gameSaves = rawGameSaves;
  const purchases = rawPurchases;

  const purchaseTotalsFromRaw = useMemo(() => {
    const paid = rawPurchases.filter((p) => p.price_paid > 0 && !p.bundle_id);
    let revenueEurUnifiedCents = 0;
    for (const p of paid) {
      revenueEurUnifiedCents += adminUnifiedRevenueEurCents(p);
    }
    return {
      revenueEurUnifiedCents,
      paidBuyerCount: new Set(paid.map((p) => p.user_id)).size,
    };
  }, [rawPurchases]);

  const kpiRevenueEurUnifiedCents =
    purchaseMetrics != null &&
      purchaseMetrics.totalRevenueEurUnifiedCents !== null
      ? purchaseMetrics.totalRevenueEurUnifiedCents
      : purchaseTotalsFromRaw.revenueEurUnifiedCents;
  const kpiPaidBuyerCount =
    purchaseMetrics?.paidBuyerCount ?? purchaseTotalsFromRaw.paidBuyerCount;

  /** Same series as "Buyers per 100 Sign-ups" chart; last point = rolling 30 days ending today. */
  const buyersPerHundredSignupsSeries = useMemo(() => {
    const data: Array<{ date: string; buyersPerHundred: number }> = [];
    const now = new Date();
    const days = ADMIN_OVERVIEW_CHART_DAYS[buyersPerHundredChartTimeRange];
    const paidPurchases = rawPurchases.filter(
      (p) => p.price_paid > 0 && !p.bundle_id,
    );
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const windowEnd = endOfDay(date);
      const windowStart = startOfDay(subDays(date, 29));
      const signUpUserIds = new Set(
        rawAuthSignups
          .filter((u) => {
            const createdDate = parseISO(u.created_at);
            return createdDate >= windowStart && createdDate <= windowEnd;
          })
          .map((u) => u.id),
      );
      const signUps = signUpUserIds.size;
      const windowBuyers = new Set(
        paidPurchases
          .filter((p) => {
            const purchaseDate = parseISO(p.purchased_at);
            return purchaseDate >= windowStart && purchaseDate <= windowEnd;
          })
          .map((p) => p.user_id),
      );
      const buyersPerHundred =
        signUps > 0 ? (windowBuyers.size / signUps) * 100 : 0;
      const dateFormat = days > 90 ? "MMM dd" : "MMM dd";
      data.push({
        date: format(date, dateFormat),
        buyersPerHundred: parseFloat(buyersPerHundred.toFixed(2)),
      });
    }
    return data;
  }, [rawPurchases, rawAuthSignups, buyersPerHundredChartTimeRange]);

  const getBuyersPerHundredOverTime = useCallback(
    () => buyersPerHundredSignupsSeries,
    [buyersPerHundredSignupsSeries],
  );

  const getBuyersPerHundred = useCallback(() => {
    const s = buyersPerHundredSignupsSeries;
    if (s.length === 0) return "0.00";
    return s[s.length - 1].buyersPerHundred.toFixed(2);
  }, [buyersPerHundredSignupsSeries]);

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

  // Define all hooks BEFORE conditional returns to comply with React rules
  const getButtonClicksOverTime = useCallback(() => {
    const filteredByCompletion = showCompletedOnly
      ? clickData.filter((d) => {
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
      : clickData;

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
  }, [clickData, gameSaves, showCompletedOnly]);

  const getClickTypesByTimestamp = useCallback(() => {
    const filteredByCompletion = showCompletedOnly
      ? clickData.filter((d) => {
        const save = gameSaves.find((s) => s.user_id === d.user_id);
        return save?.game_state?.gameComplete;
      })
      : clickData;

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
  }, [clickData, gameSaves, showCompletedOnly, selectedClickTypes]);

  const getTotalClicksByButton = useCallback(() => {
    const filteredByCompletion = showCompletedOnly
      ? clickData.filter((d) => {
        const save = gameSaves.find((s) => s.user_id === d.user_id);
        return save?.game_state?.gameComplete;
      })
      : clickData;

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
  }, [clickData, gameSaves, showCompletedOnly]);

  const getAverageClicksByButton = useCallback(() => {
    const filteredByCompletion = showCompletedOnly
      ? clickData.filter((d) => {
        const save = gameSaves.find((s) => s.user_id === d.user_id);
        return save?.game_state?.gameComplete;
      })
      : clickData;

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
  }, [clickData, gameSaves, showCompletedOnly]);

  // All memos MUST be defined before conditional returns to comply with React rules
  const getStatsOverPlaytime = useMemo(() => {
    const relevant = clickData;

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

    // Use the resources field from button_clicks table (it contains stats too)
    relevant.forEach((clickEntry) => {
      if (!clickEntry.resources) return;

      // clickEntry.resources is structured as: { "10m": { "strength": 4, "luck": 5, ... }, "20m": { ... } }
      Object.entries(clickEntry.resources).forEach(([playtimeKey, resources]) => {
        // playtimeKey is in format like "10m", "20m", etc.
        const playtimeMinutes = parseInt(playtimeKey);
        if (isNaN(playtimeMinutes)) return;

        const bucket = Math.floor(playtimeMinutes / 60);

        if (bucket >= 0 && bucket < 24) {
          const data = timeMap.get(bucket)!;
          if (selectedStats.has('strength') && typeof resources.strength === 'number') {
            data.strength.push(resources.strength);
          }
          if (selectedStats.has('knowledge') && typeof resources.knowledge === 'number') {
            data.knowledge.push(resources.knowledge);
          }
          if (selectedStats.has('luck') && typeof resources.luck === 'number') {
            data.luck.push(resources.luck);
          }
          if (selectedStats.has('madness') && typeof resources.madness === 'number') {
            data.madness.push(resources.madness);
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
  }, [clickData, selectedStats]);

  const getResourceStatsOverPlaytime = useMemo(() => {
    const relevant = clickData;
    const resourceKeys = ['food', 'bones', 'fur', 'wood', 'stone', 'iron', 'coal', 'sulfur', 'obsidian', 'adamant', 'moonstone', 'leather', 'steel', 'gold', 'silver'];

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

    // Use the resources field from button_clicks table
    relevant.forEach((clickEntry) => {
      if (!clickEntry.resources) return;

      // clickEntry.resources is structured as: { "10m": { "wood": 722, ... }, "20m": { ... } }
      Object.entries(clickEntry.resources).forEach(([playtimeKey, resources]) => {
        // playtimeKey is in format like "10m", "20m", etc.
        const playtimeMinutes = parseInt(playtimeKey);
        if (isNaN(playtimeMinutes)) return;

        const bucket = Math.floor(playtimeMinutes / 60);

        if (bucket >= 0 && bucket < 24) {
          const data = timeMap.get(bucket)!;
          resourceKeys.forEach(key => {
            if (selectedResources.has(key) && typeof resources[key] === 'number') {
              data[key].push(resources[key]);
            }
          });
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
  }, [clickData, selectedResources]);

  const getButtonUpgradesOverPlaytime = useMemo(() => {
    const relevant = gameSaves;

    if (relevant.length === 0) {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}h`,
        caveExplore: 0, mineStone: 0, mineIron: 0, mineCoal: 0, mineSulfur: 0, mineObsidian: 0, mineAdamant: 0, hunt: 0, chopWood: 0,
      }));
    }

    const timeMap = new Map<number, { caveExplore: number[], mineStone: number[], mineIron: number[], mineCoal: number[], mineSulfur: number[], mineObsidian: number[], mineAdamant: number[], hunt: number[], chopWood: number[] }>();
    for (let i = 0; i < 24; i++) {
      timeMap.set(i, { caveExplore: [], mineStone: [], mineIron: [], mineCoal: [], mineSulfur: [], mineObsidian: [], mineAdamant: [], hunt: [], chopWood: [] });
    }

    // Use game saves to get button upgrade levels at different playtimes
    relevant.forEach((save) => {
      if (!save.game_state?.buttonUpgrades) return;

      const playTimeMinutes = save.game_state.playTime ? Math.floor(save.game_state.playTime / 60000) : 0;
      const bucket = Math.floor(playTimeMinutes / 60);

      if (bucket >= 0 && bucket < 24) {
        const data = timeMap.get(bucket)!;
        const upgrades = save.game_state.buttonUpgrades;

        if (selectedMiningTypes.has('caveExplore') && upgrades.caveExplore) {
          data.caveExplore.push(upgrades.caveExplore.level || 0);
        }
        if (selectedMiningTypes.has('mineStone') && upgrades.mineStone) {
          data.mineStone.push(upgrades.mineStone.level || 0);
        }
        if (selectedMiningTypes.has('mineIron') && upgrades.mineIron) {
          data.mineIron.push(upgrades.mineIron.level || 0);
        }
        if (selectedMiningTypes.has('mineCoal') && upgrades.mineCoal) {
          data.mineCoal.push(upgrades.mineCoal.level || 0);
        }
        if (selectedMiningTypes.has('mineSulfur') && upgrades.mineSulfur) {
          data.mineSulfur.push(upgrades.mineSulfur.level || 0);
        }
        if (selectedMiningTypes.has('mineObsidian') && upgrades.mineObsidian) {
          data.mineObsidian.push(upgrades.mineObsidian.level || 0);
        }
        if (selectedMiningTypes.has('mineAdamant') && upgrades.mineAdamant) {
          data.mineAdamant.push(upgrades.mineAdamant.level || 0);
        }
        if (selectedMiningTypes.has('hunt') && upgrades.hunt) {
          data.hunt.push(upgrades.hunt.level || 0);
        }
        if (selectedMiningTypes.has('chopWood') && upgrades.chopWood) {
          data.chopWood.push(upgrades.chopWood.level || 0);
        }
      }
    });

    const result = Array.from({ length: 24 }, (_, i) => {
      const levels = timeMap.get(i)!;
      return {
        time: `${i}h`,
        caveExplore: levels.caveExplore.length > 0 ? levels.caveExplore.reduce((a, b) => a + b, 0) / levels.caveExplore.length : 0,
        mineStone: levels.mineStone.length > 0 ? levels.mineStone.reduce((a, b) => a + b, 0) / levels.mineStone.length : 0,
        mineIron: levels.mineIron.length > 0 ? levels.mineIron.reduce((a, b) => a + b, 0) / levels.mineIron.length : 0,
        mineCoal: levels.mineCoal.length > 0 ? levels.mineCoal.reduce((a, b) => a + b, 0) / levels.mineCoal.length : 0,
        mineSulfur: levels.mineSulfur.length > 0 ? levels.mineSulfur.reduce((a, b) => a + b, 0) / levels.mineSulfur.length : 0,
        mineObsidian: levels.mineObsidian.length > 0 ? levels.mineObsidian.reduce((a, b) => a + b, 0) / levels.mineObsidian.length : 0,
        mineAdamant: levels.mineAdamant.length > 0 ? levels.mineAdamant.reduce((a, b) => a + b, 0) / levels.mineAdamant.length : 0,
        hunt: levels.hunt.length > 0 ? levels.hunt.reduce((a, b) => a + b, 0) / levels.hunt.length : 0,
        chopWood: levels.chopWood.length > 0 ? levels.chopWood.reduce((a, b) => a + b, 0) / levels.chopWood.length : 0,
      };
    });

    return result;
  }, [gameSaves, selectedMiningTypes]);

  const getGameCompletionStats = useCallback(() => {
    const relevantSaves = gameSaves;

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
  }, [gameSaves]);

  const getDailyPurchases = useCallback(() => {
    const data: Array<{ day: string; purchases: number }> = [];
    const now = new Date();

    const days = ADMIN_TWELVE_MONTH_CHART_DAYS[purchasesChartTimeRange];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dailyPurchases = rawPurchases.filter((purchase) => {
        const purchaseDate = parseISO(purchase.purchased_at);
        return purchaseDate >= dayStart && purchaseDate <= dayEnd && purchase.price_paid > 0 && !purchase.bundle_id;
      }).length;

      // Format date based on time range
      const dateFormat = days > 90 ? "MMM dd" : "MMM dd";
      data.push({
        day: format(date, dateFormat),
        purchases: dailyPurchases,
      });
    }

    return data;
  }, [rawPurchases, purchasesChartTimeRange]);

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

    const days = ADMIN_TWELVE_MONTH_CHART_DAYS[referralsChartTimeRange];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Use raw saves so the chart window is not clipped by the dashboard time-range filter
      const dailyReferrals = rawGameSaves.reduce((sum, save) => {
        const referrals = save.game_state?.referrals || [];
        return sum + referrals.filter((ref: any) => {
          const timestamp = ref.timestamp || ref.created_at;
          if (!timestamp) return false;

          // Handle both number (milliseconds) and string (ISO date) timestamps
          let refDate: Date;
          try {
            if (typeof timestamp === 'number') {
              refDate = new Date(timestamp);
            } else if (typeof timestamp === 'string') {
              refDate = parseISO(timestamp);
            } else {
              return false;
            }

            return refDate >= dayStart && refDate <= dayEnd;
          } catch {
            return false;
          }
        }).length;
      }, 0);

      const dateFormat = days > 90 ? "MMM d" : "MMM dd";
      data.push({
        day: format(date, dateFormat),
        referrals: dailyReferrals,
      });
    }

    return data;
  }, [rawGameSaves, referralsChartTimeRange]);

  const getTopReferrers = useCallback(() => {
    const referrerCounts = new Map<string, number>();

    gameSaves.forEach((save) => {
      const referrals = save.game_state?.referrals || [];
      if (referrals.length > 0) {
        const uid = save.user_id;
        const label =
          uid != null && uid !== ""
            ? String(uid).substring(0, 8) + "..."
            : "(unknown)...";
        referrerCounts.set(label, referrals.length);
      }
    });

    return Array.from(referrerCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [gameSaves]);

  const getSleepUpgradesDistribution = useCallback(() => {
    const completedSaves = showCompletedOnly
      ? gameSaves.filter((s) => s.game_state?.gameComplete)
      : gameSaves;

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
  }, [gameSaves, showCompletedOnly]);

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
      if (typeof data.currentDau === 'number') {
        setCurrentDau(data.currentDau);
      }
      if (typeof data.currentWau === 'number') {
        setCurrentWau(data.currentWau);
      }
      if (typeof data.currentMau === 'number') {
        setCurrentMau(data.currentMau);
      }
      if (Array.isArray(data.dailySignups)) {
        setDailySignupsData(data.dailySignups);
      }
      if (Array.isArray(data.hourlySignups)) {
        setHourlySignupsData(data.hourlySignups);
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

      // Set dashboard data for the active environment
      if (data.clicks) {
        setRawClickData(data.clicks);
      }
      if (data.saves) {
        setRawGameSaves(data.saves);
      }
      if (data.purchases) {
        setRawPurchases(data.purchases);
      }
      if (data.authSignups) {
        setRawAuthSignups(data.authSignups);
      }
      if (typeof data.totalUserCount === 'number') {
        setTotalUserCount(data.totalUserCount);
      }
      if (data.registrationMethodStats) {
        setRegistrationMethodStats(data.registrationMethodStats);
      }
      if (data.marketingMetrics && typeof data.marketingMetrics === "object") {
        setMarketingMetrics({
          marketingUsersPrompted:
            Number(data.marketingMetrics.marketingUsersPrompted) || 0,
          marketingUsersOptedIn:
            Number(data.marketingMetrics.marketingUsersOptedIn) || 0,
          marketingOptInRate:
            Number(data.marketingMetrics.marketingOptInRate) || 0,
        });
      }
      if (typeof data.accountsDeletedAnonymized === "number") {
        setAccountsDeletedAnonymized(
          Math.max(0, Math.floor(data.accountsDeletedAnonymized)),
        );
      }
      const pm = data.purchaseMetrics as
        | {
          paid_buyer_count?: number | string;
          total_revenue_eur_unified_cents?: number | string;
        }
        | undefined
        | null;
      if (pm && pm.paid_buyer_count != null) {
        const unifiedRaw = pm.total_revenue_eur_unified_cents;
        setPurchaseMetrics({
          paidBuyerCount: Number(pm.paid_buyer_count) || 0,
          totalRevenueEurUnifiedCents:
            unifiedRaw !== undefined && unifiedRaw !== null
              ? Number(unifiedRaw) || 0
              : null,
        });
      } else {
        setPurchaseMetrics(null);
      }

      setLastUpdated(new Date());
    } catch (error) {
      logger.error("Failed to load admin data:", error);
    }
  };

  const downloadResendProdCsv = useCallback(
    async (file: "marketing" | "no-marketing") => {
      if (environment !== "prod") return;
      setResendCsvBusy(file);
      try {
        const supabase = await getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          logger.error("Resend CSV: no session");
          return;
        }
        const res = await fetch(`/api/admin/resend-contact-csv?file=${file}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const text = await res.text();
          logger.error("Resend CSV download failed:", res.status, text);
          return;
        }
        const blob = await res.blob();
        let filename =
          file === "marketing"
            ? "resend-marketing-opt-in.csv"
            : "resend-no-marketing.csv";
        const cd = res.headers.get("Content-Disposition");
        const quoted = cd?.match(/filename="([^"]+)"/);
        const plain = cd?.match(/filename=([^;\s]+)/);
        if (quoted?.[1]) {
          filename = quoted[1].trim();
        } else if (plain?.[1]) {
          filename = plain[1].trim();
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } finally {
        setResendCsvBusy(null);
      }
    },
    [environment],
  );

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
              </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex w-auto">
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
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  <TabsTrigger value="lookup">User Lookup</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="overview">
                <OverviewTab
                  environment={environment}
                  gameSaves={gameSaves}
                  dailyActiveUsersData={dauData}
                  registrationMethodStats={registrationMethodStats}
                  getDailyActiveUsers={() => currentDau}
                  getWeeklyActiveUsers={() => currentWau}
                  getMonthlyActiveUsers={() => currentMau}
                  totalUserCount={totalUserCount}
                  formatTime={formatTime}
                  getAveragePlaytime={() => {
                    const completedSaves = showCompletedOnly
                      ? gameSaves.filter((s) => s.game_state?.gameComplete)
                      : gameSaves;

                    if (completedSaves.length === 0) return 0;

                    const totalPlayTime = completedSaves.reduce(
                      (sum, save) => sum + (save.game_state?.playTime || 0),
                      0,
                    );
                    return Math.floor(totalPlayTime / completedSaves.length / 60000);
                  }}
                  getAveragePlaytimeToCompletion={() => {
                    const completedSaves = gameSaves.filter(
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
                  getConversionRate={() =>
                    totalUserCount > 0
                      ? Math.round((kpiPaidBuyerCount / totalUserCount) * 100)
                      : 0
                  }
                  getBuyersPerHundred={getBuyersPerHundred}
                  getArpuEur={() =>
                    totalUserCount > 0
                      ? (kpiRevenueEurUnifiedCents / 100 / totalUserCount).toFixed(2)
                      : "0.00"
                  }
                  getTotalRevenueEurUnifiedCents={() =>
                    kpiRevenueEurUnifiedCents
                  }
                  getUserRetention={() => {
                    const data: Array<{ day: string; users: number }> = [];
                    const now = new Date();

                    const days = ADMIN_OVERVIEW_CHART_DAYS[dauChartTimeRange];

                    for (let i = days - 1; i >= 0; i--) {
                      const date = subDays(now, i);
                      const dayStart = startOfDay(date);
                      const dayEnd = endOfDay(date);

                      const activeUsers = rawGameSaves.filter((save) => { // Use raw for historical accuracy
                        const activityDate = parseISO(save.updated_at);
                        return activityDate >= dayStart && activityDate <= dayEnd;
                      }).length;

                      // Format date based on time range
                      const dateFormat = days > 90 ? "MMM dd" : "MMM dd";
                      data.push({
                        day: format(date, dateFormat),
                        users: activeUsers,
                      });
                    }

                    return data;
                  }}
                  getDailySignups={() => {
                    const days = ADMIN_OVERVIEW_CHART_DAYS[dailySignupsChartTimeRange];

                    // Server keys are UTC calendar dates (DATE(created_at) in Postgres/UTC).
                    // Generate our range in UTC too so keys align regardless of the browser's timezone.
                    const lookup = new Map<string, number>();
                    for (const entry of dailySignupsData) {
                      lookup.set(entry.day, entry.signups);
                    }

                    const now = new Date();
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return Array.from({ length: days }, (_, i) => {
                      const d = new Date(Date.UTC(
                        now.getUTCFullYear(),
                        now.getUTCMonth(),
                        now.getUTCDate() - (days - 1 - i),
                      ));
                      const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD" UTC
                      const label = `${monthNames[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
                      return { day: label, signups: lookup.get(key) ?? 0 };
                    });
                  }}
                  dailySignupsData={dailySignupsData}
                  dauChartTimeRange={dauChartTimeRange}
                  setDauChartTimeRange={setDauChartTimeRange}
                  dailySignupsChartTimeRange={dailySignupsChartTimeRange}
                  setDailySignupsChartTimeRange={setDailySignupsChartTimeRange}
                  buyersPerHundredChartTimeRange={buyersPerHundredChartTimeRange}
                  setBuyersPerHundredChartTimeRange={setBuyersPerHundredChartTimeRange}
                  gainPerHundredChartTimeRange={gainPerHundredChartTimeRange}
                  setGainPerHundredChartTimeRange={setGainPerHundredChartTimeRange}
                  getHourlySignups={() => {
                    const now = new Date();

                    // Build a lookup from the server data (HH:00 → count)
                    const lookup = new Map<string, number>();
                    for (const entry of hourlySignupsData) {
                      lookup.set(format(parseISO(entry.hour_start), "HH:mm"), entry.signups);
                    }

                    // Emit one entry per hour for the last 24 hours so the chart has no gaps
                    return Array.from({ length: 24 }, (_, i) => {
                      const hour = new Date(now);
                      hour.setHours(now.getHours() - (23 - i), 0, 0, 0);
                      const key = format(hour, "HH:mm");
                      return { hour: key, signups: lookup.get(key) ?? 0 };
                    });
                  }}
                  getBuyersPerHundredOverTime={getBuyersPerHundredOverTime}
                  getGainPerHundredOverTime={() => {
                    const data: Array<{
                      date: string;
                      gainPerHundredEur: number;
                    }> = [];
                    const now = new Date();

                    const days = ADMIN_OVERVIEW_CHART_DAYS[gainPerHundredChartTimeRange];

                    const paidPurchases = rawPurchases.filter(
                      (p) => p.price_paid > 0 && !p.bundle_id
                    );

                    // Rolling 30-day: unified EUR revenue (minor units) per 100 sign-ups.
                    for (let i = days - 1; i >= 0; i--) {
                      const date = subDays(now, i);
                      const windowEnd = endOfDay(date);
                      const windowStart = startOfDay(subDays(date, 29));

                      // Sign-ups in last 30 days (auth account creation)
                      const signUpUserIds = new Set(
                        rawAuthSignups
                          .filter((u) => {
                            const createdDate = parseISO(u.created_at);
                            return createdDate >= windowStart && createdDate <= windowEnd;
                          })
                          .map((u) => u.id)
                      );
                      const signUps = signUpUserIds.size;

                      const inWindow = paidPurchases.filter((p) => {
                        const purchaseDate = parseISO(p.purchased_at);
                        return purchaseDate >= windowStart && purchaseDate <= windowEnd;
                      });
                      let windowEur = 0;
                      for (const p of inWindow) {
                        windowEur += adminUnifiedRevenueEurCents(p);
                      }

                      const gainPerHundredEur =
                        signUps > 0
                          ? (windowEur / 100) / (signUps / 100)
                          : 0;

                      const dateFormat = days > 90 ? "MMM dd" : "MMM dd";
                      data.push({
                        date: format(date, dateFormat),
                        gainPerHundredEur: parseFloat(
                          gainPerHundredEur.toFixed(2),
                        ),
                      });
                    }

                    return data;
                  }}
                  marketingMetrics={marketingMetrics}
                  accountsDeletedAnonymized={accountsDeletedAnonymized}
                  showResendCsvExport={environment === "prod"}
                  resendCsvBusy={resendCsvBusy}
                  onResendCsvDownload={downloadResendProdCsv}
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

                    const completedSaves = showCompletedOnly
                      ? gameSaves.filter((s) => s.game_state?.gameComplete)
                      : gameSaves;

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
                    const completedSaves = showCompletedOnly
                      ? gameSaves.filter((s) => s.game_state?.gameComplete)
                      : gameSaves;

                    if (completedSaves.length === 0) return 0;

                    const totalPlayTime = completedSaves.reduce(
                      (sum, save) => sum + (save.game_state?.playTime || 0),
                      0,
                    );
                    return Math.floor(totalPlayTime / completedSaves.length / 60000);
                  }}
                  getAveragePlaytimeToCompletion={() => {
                    const completedSaves = gameSaves.filter(
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
                  getTotalRevenueEurUnifiedCents={() =>
                    kpiRevenueEurUnifiedCents
                  }
                  getDailyPurchases={getDailyPurchases}
                  getPurchasesByPlaytime={getPurchasesByPlaytime}
                  getPurchaseStats={getPurchaseStats}
                  purchasesChartTimeRange={purchasesChartTimeRange}
                  setPurchasesChartTimeRange={setPurchasesChartTimeRange}
                />
              </TabsContent>

              <TabsContent value="referrals">
                <ReferralsTab
                  getTotalReferrals={getTotalReferrals}
                  gameSaves={gameSaves}
                  getDailyReferrals={getDailyReferrals}
                  getTopReferrers={getTopReferrers}
                  referralsChartTimeRange={referralsChartTimeRange}
                  setReferralsChartTimeRange={setReferralsChartTimeRange}
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
                  selectedMiningTypes={selectedMiningTypes}
                  setSelectedMiningTypes={setSelectedMiningTypes}
                  buttonUpgradesOverPlaytime={getButtonUpgradesOverPlaytime}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="sessions">
                <SessionsTab environment={environment} />
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