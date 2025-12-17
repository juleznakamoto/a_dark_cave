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
                  rawClickData={rawClickData}
                  rawGameSaves={rawGameSaves}
                  rawPurchases={rawPurchases}
                  users={users}
                  totalUserCount={totalUserCount}
                  dauData={dauData}
                  emailConfirmationStats={emailConfirmationStats}
                  timeRange={timeRange}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  gameSaves={gameSaves} // Pass filtered gameSaves
                  clickData={clickData} // Pass filtered clickData
                  purchases={purchases} // Pass filtered purchases
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
                  clickData={clickData}
                  gameSaves={gameSaves}
                  users={users}
                  selectedUser={selectedUser}
                  setSelectedUser={setSelectedUser}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  timeRange={timeRange}
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
                  selectedClickTypes={selectedClickTypes}
                  setSelectedClickTypes={setSelectedClickTypes}
                  COLORS={COLORS}
                  cleanButtonName={cleanButtonName}
                />
              </TabsContent>

              <TabsContent value="completion">
                <CompletionTab
                  gameSaves={gameSaves}
                  showCompletedOnly={showCompletedOnly}
                  setShowCompletedOnly={setShowCompletedOnly}
                  selectedUser={selectedUser}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="purchases">
                <PurchasesTab
                  purchases={purchases}
                  rawPurchases={rawPurchases}
                  getTotalRevenue={() =>
                    rawPurchases
                      .filter((p) => p.price_paid > 0 && !p.bundle_id)
                      .reduce((sum, p) => sum + p.price_paid, 0)
                  }
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  timeRange={timeRange}
                />
              </TabsContent>

              <TabsContent value="referrals">
                <ReferralsTab
                  gameSaves={gameSaves}
                  rawPurchases={rawPurchases}
                  totalUserCount={totalUserCount}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  timeRange={timeRange}
                />
              </TabsContent>

              <TabsContent value="churn">
                <ChurnTab
                  gameSaves={gameSaves}
                  clickData={clickData}
                  churnDays={churnDays}
                  setChurnDays={setChurnDays}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  timeRange={timeRange}
                />
              </TabsContent>

              <TabsContent value="sleep">
                <SleepTab
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  timeRange={timeRange}
                />
              </TabsContent>

              <TabsContent value="resources">
                <ResourcesTab
                  clickData={clickData}
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  timeRange={timeRange}
                  selectedResources={selectedResources}
                  setSelectedResources={setSelectedResources}
                  COLORS={COLORS}
                />
              </TabsContent>

              <TabsContent value="upgrades">
                <UpgradesTab
                  gameSaves={gameSaves}
                  selectedUser={selectedUser}
                  showCompletedOnly={showCompletedOnly}
                  timeRange={timeRange}
                  selectedMiningTypes={selectedMiningTypes}
                  setSelectedMiningTypes={setSelectedMiningTypes}
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