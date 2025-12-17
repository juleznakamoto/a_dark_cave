import { useEffect, useState, useMemo } from "react";
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

// Mock useQuery for standalone execution if not in a React Query context
const useQuery = (options) => {
  const { queryKey, queryFn } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await queryFn();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [queryKey, queryFn]); // Re-fetch if queryKey or queryFn changes

  return { data, error, isLoading };
};

interface ButtonClickData {
  user_id: string;
  clicks: Record<string, number>;
  timestamp: string; // Added timestamp for filtering by date
  stats?: Record<string, any>; // Stats snapshots
  resources?: Record<string, any>; // Resource snapshots
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

  // Helper function to filter data by time range - MUST be defined before useMemo calls
  const filterByTimeRange = <
    T extends {
      timestamp?: string;
      updated_at?: string;
      purchased_at?: string;
      created_at?: string;
    },
  >(
    data: T[],
    dateField: keyof T,
  ): T[] => {
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
  };

  // Prefiltered data based on timeRange
  const clickData = useMemo(() => filterByTimeRange(rawClickData, "timestamp"), [rawClickData, timeRange]);
  const gameSaves = useMemo(() => filterByTimeRange(rawGameSaves, "updated_at"), [rawGameSaves, timeRange]);
  const purchases = useMemo(() => filterByTimeRange(rawPurchases, "purchased_at"), [rawPurchases, timeRange]);

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


  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Reload data when environment changes
  useEffect(() => {
    if (isAuthorized) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [environment]);

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

  // Helper to get playtime bucket label (e.g., "0-59m", "60-119m")
  const getBucketLabel = (playTimeMinutes: number): string => {
    if (playTimeMinutes < 60) return "0-59m";
    if (playTimeMinutes < 120) return "60-119m";
    if (playTimeMinutes < 180) return "120-179m";
    if (playTimeMinutes < 240) return "180-239m";
    if (playTimeMinutes < 300) return "240-299m";
    return "300+m"; // For 5+ hours
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
                  getDailyActiveUsers={() => {
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
                      (s) => s.game_state?.gameComplete,
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
                      ? (totalRevenue / 100 / totalUserCount).toFixed(2)
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

                      const activeUsers = rawGameSaves.filter((save) => {
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

                      const signups = rawGameSaves.filter((save) => {
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

                    for (let i = 23; i >= 0; i--) {
                      const hour = new Date(now);
                      hour.setHours(now.getHours() - i, 0, 0, 0);
                      const nextHour = new Date(hour);
                      nextHour.setHours(hour.getHours() + 1);

                      const signups = rawGameSaves.filter((save) => {
                        const createdDate = parseISO(save.created_at);
                        return createdDate >= hour && createdDate < nextHour && createdDate >= oneDayAgo;
                      }).length;

                      data.push({
                        hour: format(hour, "HH:mm"),
                        signups,
                      });
                    }

                    return data;
                  }}
                />
              </TabsContent>

              <TabsContent value="engagement">
                <EngagementTab
                  getSessionLengthDistribution={() => {
                    const buckets = {
                      "0-59m": 0,
                      "60-119m": 0,
                      "120-179m": 0,
                      "180-239m": 0,
                      "240-299m": 0,
                      "300+m": 0,
                    };

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
                      (s) => s.game_state?.gameComplete,
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
                    clickData.forEach((entry) => {
                      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
                        Object.keys(playtimeClicks).forEach((button) => {
                          buttonNames.add(cleanButtonName(button));
                        });
                      });
                    });
                    return Array.from(buttonNames);
                  }}
                  getButtonClicksOverTime={() => {
                    const filteredClickData = selectedUser === "all"
                      ? clickData
                      : clickData.filter((d) => d.user_id === selectedUser);

                    const filteredByCompletion = showCompletedOnly
                      ? filteredClickData.filter((d) => {
                          const save = gameSaves.find((s) => s.user_id === d.user_id);
                          return save?.game_state?.gameComplete;
                        })
                      : filteredClickData;

                    const timeBuckets: Record<string, number> = {};
                    filteredByCompletion.forEach((entry) => {
                      Object.entries(entry.clicks).forEach(([playtime, clicks]) => {
                        const playtimeMinutes = parseInt(playtime);
                        const bucket = Math.floor(playtimeMinutes / 15) * 15;
                        const bucketKey = `${bucket}m`;
                        if (!timeBuckets[bucketKey]) timeBuckets[bucketKey] = 0;
                        const clickCount = Object.values(clicks as Record<string, number>).reduce(
                          (sum, count) => sum + count,
                          0,
                        );
                        timeBuckets[bucketKey] += clickCount;
                      });
                    });

                    return Object.entries(timeBuckets)
                      .map(([time, clicks]) => ({ time, clicks }))
                      .sort((a, b) => parseInt(a.time) - parseInt(b.time));
                  }}
                  getClickTypesByTimestamp={() => {
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
                    filteredByCompletion.forEach((entry) => {
                      Object.entries(entry.clicks).forEach(([playtime, clicks]) => {
                        const playtimeMinutes = parseInt(playtime);
                        const bucket = Math.floor(playtimeMinutes / 15) * 15;
                        const bucketKey = `${bucket}m`;
                        if (!timeBuckets[bucketKey]) timeBuckets[bucketKey] = {};

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
                    });

                    return Object.entries(timeBuckets)
                      .map(([time, clicks]) => ({ time, ...clicks }))
                      .sort((a, b) => parseInt(a.time) - parseInt(b.time));
                  }}
                  getTotalClicksByButton={() => {
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
                  }}
                  getAverageClicksByButton={() => {
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
                  }}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="completion">
                <CompletionTab
                  gameSaves={gameSaves}
                  getGameCompletionStats={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    const completed = completedSaves.filter(
                      (s) =>
                        s.game_state?.events?.cube15a ||
                        s.game_state?.events?.cube15b ||
                        s.game_state?.events?.cube13 ||
                        s.game_state?.events?.cube14a ||
                        s.game_state?.events?.cube14b ||
                        s.game_state?.events?.cube14c ||
                        s.game_state?.events?.cube14d,
                    ).length;

                    const notCompleted = completedSaves.length - completed;

                    return [
                      { name: "Completed", value: completed },
                      { name: "Not Completed", value: notCompleted },
                    ];
                  }}
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
                  getDailyPurchases={() => {
                    const data: Array<{ day: string; purchases: number }> = [];
                    const now = new Date();

                    for (let i = 29; i >= 0; i--) {
                      const date = subDays(now, i);
                      const dayStart = startOfDay(date);
                      const dayEnd = endOfDay(date);

                      const dailyPurchases = rawPurchases.filter((purchase) => {
                        const purchaseDate = parseISO(purchase.purchased_at);
                        return purchaseDate >= dayStart && purchaseDate <= dayEnd && purchase.price_paid > 0 && !purchase.bundle_id;
                      }).length;

                      data.push({
                        day: format(date, "MMM dd"),
                        purchases: dailyPurchases,
                      });
                    }

                    return data;
                  }}
                  getPurchasesByPlaytime={() => {
                    const playtimeBuckets = new Map<number, number>();
                    let maxBucket = 0;

                    purchases.filter((p) => p.price_paid > 0 && !p.bundle_id).forEach((purchase) => {
                      const save = gameSaves.find((s) => s.user_id === purchase.user_id);
                      if (save) {
                        const playTimeMinutes = save.game_state?.playTime
                          ? Math.round(save.game_state.playTime / 1000 / 60)
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
                  }}
                  getPurchaseStats={() => {
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
                  }}
                />
              </TabsContent>

              <TabsContent value="referrals">
                <ReferralsTab
                  gameSaves={gameSaves}
                  getTotalReferrals={() => {
                    return gameSaves.reduce((sum, save) => {
                      return sum + (save.game_state?.referrals?.length || 0);
                    }, 0);
                  }}
                  getDailyReferrals={() => {
                    const data: Array<{ day: string; referrals: number }> = [];
                    const now = new Date();

                    for (let i = 29; i >= 0; i--) {
                      const date = subDays(now, i);
                      const dayStart = startOfDay(date);
                      const dayEnd = endOfDay(date);

                      const dailyReferrals = gameSaves.reduce((sum, save) => {
                        const referrals = save.game_state?.referrals || [];
                        return sum + referrals.filter((ref: any) => {
                          const refDate = parseISO(ref.timestamp || ref.created_at);
                          return refDate >= dayStart && refDate <= dayEnd;
                        }).length;
                      }, 0);

                      data.push({
                        day: format(date, "MMM dd"),
                        referrals: dailyReferrals,
                      });
                    }

                    return data;
                  }}
                  getTopReferrers={() => {
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
                  }}
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
                  getCubeEventNumber={(eventId: string) => {
                    const match = eventId.match(/cube(\d+)/);
                    return match ? parseInt(match[1]) : null;
                  }}
                />
              </TabsContent>

              <TabsContent value="sleep">
                <SleepTab
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  getSleepUpgradesDistribution={() => {
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
                  }}
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
                  getStatsOverPlaytime={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    const playtimeBuckets = new Map<number, Map<string, number[]>>();
                    let maxBucket = 0;

                    completedSaves.forEach((save) => {
                      const playTimeMinutes = save.game_state?.playTime
                        ? Math.round(save.game_state.playTime / 1000 / 60)
                        : 0;
                      const bucket = Math.floor(playTimeMinutes / 60) * 60;
                      maxBucket = Math.max(maxBucket, bucket);

                      if (!playtimeBuckets.has(bucket)) {
                        playtimeBuckets.set(bucket, new Map());
                      }

                      const bucketData = playtimeBuckets.get(bucket)!;
                      const stats = save.game_state?.stats || {};

                      ["strength", "knowledge", "luck", "madness"].forEach((stat) => {
                        if (!bucketData.has(stat)) {
                          bucketData.set(stat, []);
                        }
                        bucketData.get(stat)!.push(stats[stat] || 0);
                      });
                    });

                    const result: Array<{ time: string; [key: string]: any }> = [];
                    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
                      const hours = bucket / 60;
                      const dataPoint: { time: string; [key: string]: any } = {
                        time: hours === 0 ? "0h" : `${hours}h`,
                      };

                      const bucketData = playtimeBuckets.get(bucket);
                      ["strength", "knowledge", "luck", "madness"].forEach((stat) => {
                        const values = bucketData?.get(stat) || [];
                        dataPoint[stat] = values.length > 0
                          ? values.reduce((sum, val) => sum + val, 0) / values.length
                          : 0;
                      });

                      result.push(dataPoint);
                    }

                    return result;
                  }}
                  getResourceStatsOverPlaytime={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    const playtimeBuckets = new Map<number, Map<string, number[]>>();
                    let maxBucket = 0;

                    completedSaves.forEach((save) => {
                      const playTimeMinutes = save.game_state?.playTime
                        ? Math.round(save.game_state.playTime / 1000 / 60)
                        : 0;
                      const bucket = Math.floor(playTimeMinutes / 60) * 60;
                      maxBucket = Math.max(maxBucket, bucket);

                      if (!playtimeBuckets.has(bucket)) {
                        playtimeBuckets.set(bucket, new Map());
                      }

                      const bucketData = playtimeBuckets.get(bucket)!;
                      const resources = save.game_state?.resources || {};

                      Object.keys(resources).forEach((resource) => {
                        if (!bucketData.has(resource)) {
                          bucketData.set(resource, []);
                        }
                        bucketData.get(resource)!.push(resources[resource] || 0);
                      });
                    });

                    const result: Array<{ time: string; [key: string]: any }> = [];
                    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
                      const hours = bucket / 60;
                      const dataPoint: { time: string; [key: string]: any } = {
                        time: hours === 0 ? "0h" : `${hours}h`,
                      };

                      const bucketData = playtimeBuckets.get(bucket);
                      Array.from(selectedResources).forEach((resource) => {
                        const values = bucketData?.get(resource) || [];
                        dataPoint[resource] = values.length > 0
                          ? values.reduce((sum, val) => sum + val, 0) / values.length
                          : 0;
                      });

                      result.push(dataPoint);
                    }

                    return result;
                  }}
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
                  getButtonUpgradesOverPlaytime={() => {
                    const filteredSaves = selectedUser === "all"
                      ? gameSaves
                      : gameSaves.filter((s) => s.user_id === selectedUser);

                    const completedSaves = showCompletedOnly
                      ? filteredSaves.filter((s) => s.game_state?.gameComplete)
                      : filteredSaves;

                    const playtimeBuckets = new Map<number, Map<string, number[]>>();
                    let maxBucket = 0;

                    completedSaves.forEach((save) => {
                      const playTimeMinutes = save.game_state?.playTime
                        ? Math.round(save.game_state.playTime / 1000 / 60)
                        : 0;
                      const bucket = Math.floor(playTimeMinutes / 60) * 60;
                      maxBucket = Math.max(maxBucket, bucket);

                      if (!playtimeBuckets.has(bucket)) {
                        playtimeBuckets.set(bucket, new Map());
                      }

                      const bucketData = playtimeBuckets.get(bucket)!;
                      const upgrades = save.game_state?.buttonUpgrades || {};

                      ["caveExplore", "mineStone", "mineIron", "mineCoal", "mineSulfur", "mineObsidian", "mineAdamant", "hunt", "chopWood"].forEach((buttonType) => {
                        if (!bucketData.has(buttonType)) {
                          bucketData.set(buttonType, []);
                        }
                        bucketData.get(buttonType)!.push(upgrades[buttonType] || 1);
                      });
                    });

                    const result: Array<{ time: string; [key: string]: any }> = [];
                    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
                      const hours = bucket / 60;
                      const dataPoint: { time: string; [key: string]: any } = {
                        time: hours === 0 ? "0h" : `${hours}h`,
                      };

                      const bucketData = playtimeBuckets.get(bucket);
                      ["caveExplore", "mineStone", "mineIron", "mineCoal", "mineSulfur", "mineObsidian", "mineAdamant", "hunt", "chopWood"].forEach((buttonType) => {
                        const values = bucketData?.get(buttonType) || [];
                        dataPoint[buttonType] = values.length > 0
                          ? values.reduce((sum, val) => sum + val, 0) / values.length
                          : 1;
                      });

                      result.push(dataPoint);
                    }

                    return result;
                  }}
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