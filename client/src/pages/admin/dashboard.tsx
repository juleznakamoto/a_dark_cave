import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  format,
  differenceInDays,
  isWithinInterval,
  parseISO
} from 'date-fns';

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
}

// Admin emails from environment variable (comma-separated)
const getAdminEmails = (): string[] => {
  const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || '';
  return adminEmailsEnv.split(',').map(email => email.trim()).filter(Boolean);
};

// Dummy ChartContainer, ChartTooltip, ChartLegend, ChartTooltipContent, ChartLegendContent for standalone execution
const ChartContainer = ({ children, config, className }) => <div className={className}>{children}</div>;
const ChartTooltip = ({ content }) => <div>{content}</div>;
const ChartLegend = ({ content }) => <div>{content}</div>;
const ChartTooltipContent = () => <div>Tooltip Content</div>;
const ChartLegendContent = () => <div>Legend Content</div>;
const Button = ({ children, variant, size, onClick }) => <button onClick={onClick}>{children}</button>;

// Dummy buttonClicksChartConfig
const buttonClicksChartConfig = {
  mine: { label: 'Mine', color: 'hsl(var(--chart-1))' },
  hunt: { label: 'Hunt', color: 'hsl(var(--chart-2))' },
  chopWood: { label: 'Chop Wood', color: 'hsl(var(--chart-3))' },
  caveExplore: { label: 'Cave Explore', color: 'hsl(var(--chart-4))' },
};

// Helper function to clean button names by removing timestamp suffixes
const cleanButtonName = (buttonId: string): string => {
  // Remove timestamp suffixes and random number suffixes from merchant trades
  // Patterns: _1764039531673_0.6389963990042614 or _1764039531673 or -1764039531673
  return buttonId
    .replace(/_\d{13,}_[\d.]+$/, '') // Remove _timestamp_randomNumber
    .replace(/[-_]\d{13,}$/, '');     // Remove -timestamp or _timestamp
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [clickData, setClickData] = useState<ButtonClickData[]>([]);
  const [gameSaves, setGameSaves] = useState<GameSaveData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);

  // Filter states
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedButtons, setSelectedButtons] = useState<Set<string>>(new Set(['mine', 'hunt', 'chopWood', 'caveExplore'])); // Initialize with all buttons
  const [selectedClickTypes, setSelectedClickTypes] = useState<Set<string>>(new Set()); // For individual click type chart
  const [environment, setEnvironment] = useState<'dev' | 'prod'>('prod');
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false);
  const [churnDays, setChurnDays] = useState<1 | 3 | 5 | 7>(3);

  // Process clicks data for the chart - moved here before any early returns
  const buttonClicksChartData = useMemo(() => {
    if (!clickData) return [];

    // Filter by selected user
    let filteredClicks = clickData;
    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    // Filter by completed players if toggle is on
    if (showCompletedOnly) {
      const completedUserIds = new Set(
        gameSaves
          .filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b)
          .map(save => save.user_id)
      );
      filteredClicks = filteredClicks.filter(d => completedUserIds.has(d.user_id));
    }

    // Aggregate total clicks per button
    const totalClicks: Record<string, number> = {};

    filteredClicks.forEach(record => {
      // Format: { "playtime": { "button": count } }
      Object.values(record.clicks).forEach((playtimeClicks: any) => {
        Object.entries(playtimeClicks).forEach(([button, count]) => {
          const cleanButton = cleanButtonName(button);
          totalClicks[cleanButton] = (totalClicks[cleanButton] || 0) + (count as number);
        });
      });
    });

    // Convert to array format for the chart
    return Object.entries(totalClicks)
      .map(([button, clicks]) => ({
        button,
        clicks
      }))
      .sort((a, b) => b.clicks - a.clicks); // Sort by most clicked
  }, [clickData, selectedUser]);

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
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmails = getAdminEmails();

      if (!user || !adminEmails.includes(user.email || '')) {
        setLoading(false);
        setLocation('/');
        return;
      }

      setIsAuthorized(true);
      await loadData();
      setLoading(false);
    } catch (error) {
      logger.error('Auth check failed:', error);
      setLoading(false);
      setLocation('/');
    }
  };

  // Renamed from loadDashboardData to loadData
  const loadData = async () => {
    try {
      const response = await fetch(`/api/admin/data?env=${environment}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Admin data fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch admin data: ${response.status}`);
      }

      const data = await response.json();

      // Set the data
      if (data.clicks) {
        setClickData(data.clicks);
      }
      if (data.saves) {
        setGameSaves(data.saves);
      }
      if (data.purchases) {
        setPurchases(data.purchases);
      }

      // Collect unique user IDs only from users who have click data
      const userIdsWithClicks = new Set<string>();
      data.clicks?.forEach((c: any) => userIdsWithClicks.add(c.user_id));

      const userList = Array.from(userIdsWithClicks).map(id => ({
        id,
        email: id.substring(0, 8) + '...',
      }));

      setUsers(userList);
    } catch (error) {
      logger.error('Failed to load admin data:', error);
    }
  };

  // Active Users Calculations
  const getActiveUsers = (days: number) => {
    const now = new Date();
    const cutoffDate = subDays(now, days);

    const activeUserIds = new Set<string>();

    // Check button clicks
    clickData.forEach(entry => {
      // Assuming timestamp is stored and can be parsed
      const entryDate = parseISO(entry.timestamp);
      if (entryDate >= cutoffDate) {
        activeUserIds.add(entry.user_id);
      }
    });

    // Check game saves (updated_at indicates activity)
    gameSaves.forEach(save => {
      const saveDate = parseISO(save.updated_at);
      if (saveDate >= cutoffDate) {
        activeUserIds.add(save.user_id);
      }
    });

    return activeUserIds.size;
  };

  const getDailyActiveUsers = () => getActiveUsers(1);
  const getWeeklyActiveUsers = () => getActiveUsers(7);
  const getMonthlyActiveUsers = () => getActiveUsers(30);

  // Playtime Calculations
  const getAveragePlaytime = () => {
    const playtimes = gameSaves
      .map(save => save.game_state?.playTime || 0)
      .filter(time => time > 0);

    if (playtimes.length === 0) return 0;

    const avgMs = playtimes.reduce((sum, time) => sum + time, 0) / playtimes.length;
    return Math.round(avgMs / 1000 / 60); // Convert to minutes
  };

  const getAveragePlaytimeToCompletion = () => {
    const completedGames = gameSaves.filter(save => 
      save.game_state?.events?.cube15a || save.game_state?.events?.cube15b
    );

    if (completedGames.length === 0) return 0;

    const playtimes = completedGames
      .map(save => save.game_state?.playTime || 0)
      .filter(time => time > 0);

    if (playtimes.length === 0) return 0;

    const avgMs = playtimes.reduce((sum, time) => sum + time, 0) / playtimes.length;
    return Math.round(avgMs / 1000 / 60); // Convert to minutes
  };

  // Retention metrics
  const getUserRetention = () => {
    const data: { day: string; users: number }[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const activeUserIds = new Set<string>();

      clickData.forEach(entry => {
        const entryDate = parseISO(entry.timestamp);
        if (isWithinInterval(entryDate, { start: dayStart, end: dayEnd })) {
          activeUserIds.add(entry.user_id);
        }
      });

      gameSaves.forEach(save => {
        const saveDate = parseISO(save.updated_at);
        if (isWithinInterval(saveDate, { start: dayStart, end: dayEnd })) {
          activeUserIds.add(save.user_id);
        }
      });

      data.push({
        day: format(date, 'MMM dd'),
        users: activeUserIds.size,
      });
    }

    return data;
  };

  // Session length distribution
  const getSessionLengthDistribution = () => {
    const sessions = gameSaves
      .map(save => save.game_state?.playTime || 0)
      .filter(time => time > 0);

    const distribution = {
      '0-30 min': 0,
      '30-60 min': 0,
      '1-2 hours': 0,
      '2-5 hours': 0,
      '5-10 hours': 0,
      '10+ hours': 0,
    };

    sessions.forEach(timeMs => {
      const minutes = timeMs / 1000 / 60;
      if (minutes < 30) distribution['0-30 min']++;
      else if (minutes < 60) distribution['30-60 min']++;
      else if (minutes < 120) distribution['1-2 hours']++;
      else if (minutes < 300) distribution['2-5 hours']++;
      else if (minutes < 600) distribution['5-10 hours']++;
      else distribution['10+ hours']++;
    });

    return Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
    }));
  };

  // Daily sign-ups (last 30 days)
  const getDailySignups = () => {
    const data: { day: string; signups: number }[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const signupsCount = gameSaves.filter(save => {
        const createdDate = parseISO(save.created_at);
        return isWithinInterval(createdDate, { start: dayStart, end: dayEnd });
      }).length;

      data.push({
        day: format(date, 'MMM dd'),
        signups: signupsCount,
      });
    }

    return data;
  };

  // Hourly sign-ups (last 24 hours)
  const getHourlySignups = () => {
    const data: { hour: string; signups: number }[] = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000 - 1);

      const signupsCount = gameSaves.filter(save => {
        const createdDate = parseISO(save.created_at);
        return isWithinInterval(createdDate, { start: hourStart, end: hourEnd });
      }).length;

      data.push({
        hour: format(hourStart, 'HH:mm'),
        signups: signupsCount,
      });
    }

    return data;
  };

  // Daily purchases (last 30 days)
  const getDailyPurchases = () => {
    const data: { day: string; purchases: number }[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const purchasesCount = purchases.filter(purchase => {
        const purchaseDate = parseISO(purchase.purchased_at);
        return purchase.price_paid > 0 && isWithinInterval(purchaseDate, { start: dayStart, end: dayEnd });
      }).length;

      data.push({
        day: format(date, 'MMM dd'),
        purchases: purchasesCount,
      });
    }

    return data;
  };

  // Purchases by playtime
  const getPurchasesByPlaytime = () => {
    // Filter out free purchases
    const paidPurchases = purchases.filter(p => p.price_paid > 0);

    // Get playtime for each purchase by matching user_id to game saves
    const purchasesWithPlaytime = paidPurchases.map(purchase => {
      const userSave = gameSaves.find(save => save.user_id === purchase.user_id);
      const playtimeMinutes = userSave ? Math.round((userSave.game_state?.playTime || 0) / 1000 / 60) : 0;
      return {
        playtimeMinutes,
        purchase
      };
    });

    // Group into 1-hour buckets
    const buckets = new Map<number, number>();
    let maxBucket = 0;

    purchasesWithPlaytime.forEach(({ playtimeMinutes }) => {
      const bucketHours = Math.floor(playtimeMinutes / 60);
      maxBucket = Math.max(maxBucket, bucketHours);
      buckets.set(bucketHours, (buckets.get(bucketHours) || 0) + 1);
    });

    // Create array with all buckets
    const result: Array<{ playtime: string; purchases: number }> = [];
    for (let bucket = 0; bucket <= maxBucket; bucket++) {
      result.push({
        playtime: bucket === 0 ? '0h' : `${bucket}h`,
        purchases: buckets.get(bucket) || 0,
      });
    }

    return result;
  };

  // Buyers per 100 users
  const getBuyersPerHundred = () => {
    const totalUsers = gameSaves.length;
    if (totalUsers === 0) return 0;

    // Get unique users who made non-free purchases
    const buyersSet = new Set<string>();
    purchases.forEach(purchase => {
      // Assuming non-free items have price > 0
      if (purchase.price_paid > 0) {
        buyersSet.add(purchase.user_id);
      }
    });

    const buyers = buyersSet.size;
    return ((buyers / totalUsers) * 100).toFixed(1);
  };

  // Process data for charts
  const getButtonClicksOverTime = () => {
    let filteredClicks = clickData;

    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    // Filter by completed players if toggle is on
    if (showCompletedOnly) {
      const completedUserIds = new Set(
        gameSaves
          .filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b)
          .map(save => save.user_id)
      );
      filteredClicks = filteredClicks.filter(d => completedUserIds.has(d.user_id));
    }

    // Collect all playtime entries with their total clicks
    const playtimeData = new Map<number, number>();

    filteredClicks.forEach(entry => {
      // Format: { "playtime_minutes": { "button": count } }
      Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
        try {
          // Extract playtime from key like "45m"
          const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(playtimeMinutes)) {
            // Calculate total clicks at this playtime
            const totalClicks = Object.values(clicksAtTime as Record<string, number>).reduce((sum, count) => sum + count, 0);

            // Aggregate into 1-hour (60-minute) buckets
            const bucket = Math.floor(playtimeMinutes / 60) * 60;
            playtimeData.set(bucket, (playtimeData.get(bucket) || 0) + totalClicks);
          }
        } catch (e) {
          logger.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    if (playtimeData.size === 0) return [];

    // Convert to array and format for chart display
    const maxBucket = Math.max(...Array.from(playtimeData.keys()));
    const result: Array<{ time: string; clicks: number }> = [];

    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
      const hours = bucket / 60;
      result.push({
        time: hours === 0 ? '0h' : `${hours}h`,
        clicks: playtimeData.get(bucket) || 0,
      });
    }

    return result;
  };

  const getAllButtonNames = (): string[] => {
    const buttonNames = new Set<string>();
    clickData.forEach(entry => {
      // Format: { "playtime": { "button": count } }
      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
        Object.keys(playtimeClicks).forEach(button => {
          buttonNames.add(cleanButtonName(button));
        });
      });
    });
    return Array.from(buttonNames);
  };

  const getClickTypesByTimestamp = () => {
    let filteredClicks = clickData;

    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    // Filter by completed players if toggle is on
    if (showCompletedOnly) {
      const completedUserIds = new Set(
        gameSaves
          .filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b)
          .map(save => save.user_id)
      );
      filteredClicks = filteredClicks.filter(d => completedUserIds.has(d.user_id));
    }

    // Aggregate into 1-hour (60-minute) buckets
    const buckets = new Map<number, Record<string, number>>();
    let maxBucket = 0;

    filteredClicks.forEach((entry) => {
      // Format: { "playtime_minutes": { "button": count } }
      Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
        try {
          // Extract playtime from key like "45m"
          const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(playtimeMinutes)) {
            const bucket = Math.floor(playtimeMinutes / 60) * 60; // 1-hour buckets
            maxBucket = Math.max(maxBucket, bucket);

            if (!buckets.has(bucket)) {
              buckets.set(bucket, {});
            }

            const bucketData = buckets.get(bucket)!;
            Object.entries(clicksAtTime as Record<string, number>).forEach(([button, count]) => {
              const cleanButton = cleanButtonName(button);

              // Only include if selectedClickTypes is empty (all) or contains this button
              if (selectedClickTypes.size === 0 || selectedClickTypes.has(cleanButton)) {
                bucketData[cleanButton] = (bucketData[cleanButton] || 0) + count;
              }
            });
          }
        } catch (e) {
          logger.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    if (buckets.size === 0) {
      return [];
    }

    // Convert to array and format for chart display
    const result: Array<{ time: string; [key: string]: any }> = [];

    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
      const bucketData = buckets.get(bucket) || {};
      const hours = bucket / 60;
      result.push({
        time: hours === 0 ? '0h' : `${hours}h`,
        ...bucketData,
      });
    }

    return result;
  };

  const getButtonClicksOverPlaytime = () => {
    let filteredClicks = clickData;

    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    // Aggregate clicks by playtime buckets (every 15 minutes)
    const playtimeBuckets = new Map<number, Record<string, number>>();
    let maxBucket = 0;

    filteredClicks.forEach(entry => {
      // Format: { "playtime": { "button": count } }
      Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
        try {
          // Extract playtime from key like "45m"
          const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(playtimeMinutes)) {
            const bucket = Math.floor(playtimeMinutes / 15) * 15; // 15-minute buckets
            maxBucket = Math.max(maxBucket, bucket);

            if (!playtimeBuckets.has(bucket)) {
              playtimeBuckets.set(bucket, {});
            }

            const bucketData = playtimeBuckets.get(bucket)!;
            Object.entries(clicksAtTime as Record<string, number>).forEach(([button, count]) => {
              const cleanButton = cleanButtonName(button);
              if (selectedButtons.size === 0 || selectedButtons.has(cleanButton)) {
                bucketData[cleanButton] = (bucketData[cleanButton] || 0) + count;
              }
            });
          }
        } catch (e) {
          logger.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    // Create array with all buckets from 0 to max playtime
    const result: Array<{ playtime: string; [key: string]: any }> = [];
    for (let bucket = 0; bucket <= maxBucket; bucket += 15) {
      const bucketData = playtimeBuckets.get(bucket) || {};
      result.push({
        playtime: `${bucket}m`,
        ...bucketData,
      });
    }

    return result;
  };


  const getTotalClicksByButton = () => {
    let filtered = selectedUser === 'all'
      ? clickData
      : clickData.filter(d => d.user_id === selectedUser);

    // Filter by completed players if toggle is on
    if (showCompletedOnly) {
      const completedUserIds = new Set(
        gameSaves
          .filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b)
          .map(save => save.user_id)
      );
      filtered = filtered.filter(d => completedUserIds.has(d.user_id));
    }

    const totals: Record<string, number> = {};

    filtered.forEach(entry => {
      // Format: { "playtime": { "button": count } }
      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
        Object.entries(playtimeClicks).forEach(([button, count]) => {
          const cleanButton = cleanButtonName(button);
          totals[cleanButton] = (totals[cleanButton] || 0) + (count as number);
        });
      });
    });

    return Object.entries(totals)
      .map(([button, total]) => ({ button, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15); // Top 15 buttons
  };

  const getAverageClicksByButton = () => {
    let filtered = selectedUser === 'all'
      ? clickData
      : clickData.filter(d => d.user_id === selectedUser);

    // Filter by completed players if toggle is on
    if (showCompletedOnly) {
      const completedUserIds = new Set(
        gameSaves
          .filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b)
          .map(save => save.user_id)
      );
      filtered = filtered.filter(d => completedUserIds.has(d.user_id));
    }

    const buttonStats: Record<string, { total: number; users: Set<string> }> = {};

    filtered.forEach(entry => {
      // Format: { "playtime": { "button": count } }
      Object.values(entry.clicks).forEach((playtimeClicks: any) => {
        Object.entries(playtimeClicks).forEach(([button, count]) => {
          const cleanButton = cleanButtonName(button);
          if (!buttonStats[cleanButton]) {
            buttonStats[cleanButton] = { total: 0, users: new Set() };
          }
          buttonStats[cleanButton].total += count as number;
          buttonStats[cleanButton].users.add(entry.user_id);
        });
      });
    });

    return Object.entries(buttonStats)
      .map(([button, stats]) => ({
        button,
        average: parseFloat((stats.total / stats.users.size).toFixed(2))
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 15); // Top 15 buttons by average
  };

  const getGameCompletionStats = () => {
    const completed = gameSaves.filter(save =>
      save.game_state?.events?.cube15a || save.game_state?.events?.cube15b
    ).length;

    const total = gameSaves.length;

    return [
      { name: 'Completed', value: completed },
      { name: 'In Progress', value: total - completed },
    ];
  };

  const getPurchaseStats = () => {
    const stats = purchases
      .filter(purchase => purchase.item_name !== '100 Gold (Free Gift)')
      .reduce((acc, purchase) => {
        acc[purchase.item_name] = (acc[purchase.item_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  const getTotalRevenue = () => {
    return purchases.filter(p => p.price_paid > 0).reduce((sum, p) => sum + p.price_paid, 0);
  };

  // Referral stats
  const getTotalReferrals = () => {
    let totalReferrals = 0;
    gameSaves.forEach(save => {
      const referrals = save.game_state?.referrals || [];
      totalReferrals += referrals.length;
    });
    return totalReferrals;
  };

  const getDailyReferrals = () => {
    const data: { day: string; referrals: number }[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      let referralCount = 0;
      gameSaves.forEach(save => {
        const referrals = save.game_state?.referrals || [];
        referrals.forEach((referral: any) => {
          if (referral.timestamp) {
            const referralDate = new Date(referral.timestamp);
            if (isWithinInterval(referralDate, { start: dayStart, end: dayEnd })) {
              referralCount++;
            }
          }
        });
      });

      data.push({
        day: format(date, 'MMM dd'),
        referrals: referralCount,
      });
    }

    return data;
  };

  const getTopReferrers = () => {
    const referrerData: { userId: string; count: number }[] = [];

    gameSaves.forEach(save => {
      const referrals = save.game_state?.referrals || [];
      if (referrals.length > 0) {
        referrerData.push({
          userId: save.user_id.substring(0, 8) + '...',
          count: referrals.length,
        });
      }
    });

    return referrerData.sort((a, b) => b.count - a.count).slice(0, 10);
  };

  const getConversionRate = () => {
    const totalUsers = gameSaves.length;
    // Only count users who made non-free purchases (price_paid > 0)
    const payingUsers = new Set(
      purchases.filter(p => p.price_paid > 0).map(p => p.user_id)
    ).size;

    if (totalUsers === 0) return 0;
    return Math.round((payingUsers / totalUsers) * 100);
  };

  // Instagram follow tracking
  const getInstagramFollowers = () => {
    return gameSaves.filter(save => 
      save.game_state?.social_media_rewards?.instagram?.claimed
    ).length;
  };

  const getInstagramFollowRate = () => {
    const totalUsers = gameSaves.length;
    if (totalUsers === 0) return 0;
    const followers = getInstagramFollowers();
    return ((followers / totalUsers) * 100).toFixed(1);
  };

  // Get churned players (haven't had activity in X days)
  const getChurnedPlayers = () => {
    logger.log('🔍 Getting churned players START:', {
      churnDays,
      now: new Date().toISOString(),
      cutoffDate: subDays(new Date(), churnDays).toISOString(),
      clickDataLength: clickData.length,
      gameSavesLength: gameSaves.length
    });

    const now = new Date();
    const cutoffDate = subDays(now, churnDays);
    const churnedPlayers: Array<{ userId: string; lastActivity: Date; daysSinceActivity: number }> = [];

    // Get users with click data (full UUIDs)
    const usersWithClicks = new Set<string>();
    clickData.forEach(entry => usersWithClicks.add(entry.user_id));

    const clickUserSamples = Array.from(usersWithClicks).slice(0, 5);
    logger.log('📊 Users with clicks:', usersWithClicks.size, 'Sample IDs:', clickUserSamples);
    logger.log('📊 Click user ID lengths:', clickUserSamples.map(id => id.length));
    logger.log('📊 Full click user list:', Array.from(usersWithClicks));

    // Get the latest activity for each user from game saves
    // Build a map with FULL user IDs (since clicks have full IDs)
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach(save => {
      const activityDate = new Date(save.updated_at);
      // Use the full user_id from the save
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
    });

    const saveSamples = [gameSaves[0], gameSaves[1], gameSaves[2]];
    logger.log('📊 Sample save:', { user_id: saveSamples[0]?.user_id, updated_at: saveSamples[0]?.updated_at });
    logger.log('📊 Sample save:', { user_id: saveSamples[1]?.user_id, updated_at: saveSamples[1]?.updated_at });
    logger.log('📊 Sample save:', { user_id: saveSamples[2]?.user_id, updated_at: saveSamples[2]?.updated_at });
    logger.log('📊 Game save user ID lengths:', saveSamples.map(s => s?.user_id?.length));

    const allSaveUserIds = gameSaves.map(s => s.user_id);
    logger.log('📊 First 10 game save user IDs:', allSaveUserIds.slice(0, 10));

    // Check for overlap
    const clickUsersArray = Array.from(usersWithClicks);
    const overlappingUsers = clickUsersArray.filter(id => allSaveUserIds.includes(id));
    logger.log('📊 OVERLAP CHECK - Users in BOTH clicks and saves:', overlappingUsers.length);
    logger.log('📊 OVERLAP CHECK - Sample overlapping IDs:', overlappingUsers.slice(0, 5));

    logger.log('📊 Total users with activity:', userLastActivity.size);
    logger.log('📊 Sample activity dates:', Array.from(userLastActivity.entries()).slice(0, 3).map(([id, date]) => ({ id: id.substring(0, 8), date: date.toISOString() })));

    // Find users who haven't been active since cutoff AND have click data
    // ONLY iterate through users who have clicks
    let churnedCount = 0;
    let notChurnedCount = 0;

    logger.log('📊 Starting churn check for', usersWithClicks.size, 'users with clicks');

    usersWithClicks.forEach((userId) => {
      // Get last activity for this user (if they have any game saves)
      const lastActivity = userLastActivity.get(userId);

      if (!lastActivity) {
        // User has clicks but no game save - skip them
        logger.log('⚠️ User has clicks but no game save:', userId.substring(0, 8));
        return;
      }

      const isBeforeCutoff = lastActivity < cutoffDate;
      const daysSince = differenceInDays(now, lastActivity);

      // Check if they completed the game
      const save = gameSaves.find(s => s.user_id === userId);
      const hasCompletedGame = save?.game_state?.events?.cube15a || save?.game_state?.events?.cube15b;

      // Log first 5 checks to see what's happening
      if (churnedCount + notChurnedCount < 5) {
        logger.log('📊 User check:', {
          userIdFull: userId,
          userIdShort: userId.substring(0, 8),
          lastActivity: lastActivity.toISOString(),
          hasClicks: true, // We know they have clicks since we're iterating usersWithClicks
          isBeforeCutoff,
          daysSince,
          hasCompletedGame,
          willBeChurned: isBeforeCutoff && !hasCompletedGame
        });
      }

      // Only consider churned if they haven't completed the game
      if (isBeforeCutoff && !hasCompletedGame) {
        churnedCount++;
        churnedPlayers.push({
          userId: userId.substring(0, 8) + '...',
          lastActivity,
          daysSinceActivity: daysSince,
        });
      } else {
        notChurnedCount++;
      }
    });

    logger.log('📊 Churn analysis COMPLETE:', {
      churnedCount,
      notChurnedCount,
      totalChurnedPlayers: churnedPlayers.length,
      firstChurned: churnedPlayers[0],
      lastChurned: churnedPlayers[churnedPlayers.length - 1]
    });

    return churnedPlayers.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  };

  // Get the top 20 most clicked buttons from churned players at their last playtime
  const getChurnedPlayersLastClicks = () => {
    logger.log('🔍 Getting churned players last clicks START:', {
      now: new Date().toISOString(),
      cutoffDate: subDays(new Date(), churnDays).toISOString(),
      churnDays
    });

    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    // Get users with click data
    const usersWithClicks = new Set<string>();
    clickData.forEach(entry => usersWithClicks.add(entry.user_id));

    logger.log('📊 Users with clicks:', usersWithClicks.size);

    // Get churned user IDs based on game save activity AND completion status
    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach(save => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      // Check completion status
      const hasCompletedGame = save.game_state?.events?.cube15a || save.game_state?.events?.cube15b;
      if (activityDate < cutoffDate && !hasCompletedGame && usersWithClicks.has(save.user_id)) {
        churnedUserIds.add(save.user_id);
      }
    });

    logger.log('📊 Churned user IDs for clicks:', churnedUserIds.size, 'Sample:', Array.from(churnedUserIds).slice(0, 3).map(id => id.substring(0, 8)));

    // Find the maximum playtime for each churned user
    const userMaxPlaytime = new Map<string, string>();

    clickData.forEach(entry => {
      if (churnedUserIds.has(entry.user_id)) {
        Object.keys(entry.clicks).forEach(playtimeKey => {
          const minutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(minutes)) {
            const existingKey = userMaxPlaytime.get(entry.user_id);
            if (!existingKey) {
              userMaxPlaytime.set(entry.user_id, playtimeKey);
            } else {
              const existingMinutes = parseInt(existingKey.replace('m', ''));
              if (minutes > existingMinutes) {
                userMaxPlaytime.set(entry.user_id, playtimeKey);
              }
            }
          }
        });
      }
    });

    logger.log('📊 Found max playtime for', userMaxPlaytime.size, 'churned users');

    // Aggregate clicks from churned users at their LAST playtime only
    const buttonTotals: Record<string, number> = {};

    clickData.forEach(entry => {
      if (churnedUserIds.has(entry.user_id)) {
        const maxPlaytimeKey = userMaxPlaytime.get(entry.user_id);
        if (maxPlaytimeKey && entry.clicks[maxPlaytimeKey]) {
          // Only count clicks at the maximum playtime
          Object.entries(entry.clicks[maxPlaytimeKey] as Record<string, number>).forEach(([button, count]) => {
            const cleanButton = cleanButtonName(button);
            buttonTotals[cleanButton] = (buttonTotals[cleanButton] || 0) + count;
          });
        }
      }
    });

    logger.log('📊 Total unique buttons clicked at last playtime by churned users:', Object.keys(buttonTotals).length);

    // Convert to array and sort by click count, take top 20
    const topClicks = Object.entries(buttonTotals)
      .map(([button, clicks]) => ({ button, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    logger.log('📊 Returning top 20 last clicked buttons:', topClicks.length);

    return topClicks;
  };

  // Helper function to extract cube event number from event ID
  const getCubeEventNumber = (eventId: string): number | null => {
    const match = eventId.match(/^cube(\d+[a-z]?)$/);
    if (!match) return null;
    // Remove letter suffix if present (e.g., "14a" -> "14")
    const numStr = match[1].replace(/[a-z]$/, '');
    return parseInt(numStr, 10);
  };

  // Get cube events players saw over playtime
  const getCubeEventsOverPlaytime = () => {
    logger.log('🔍 Getting cube events over playtime');

    // Aggregate cube events by playtime buckets (1-hour intervals)
    const playtimeBuckets = new Map<number, Set<string>>();
    let maxBucket = 0;

    gameSaves.forEach(save => {
      const playTimeMinutes = save.playTime ? Math.round(save.playTime / 1000 / 60) : 0;
      const bucket = Math.floor(playTimeMinutes / 60) * 60; // 1-hour buckets
      maxBucket = Math.max(maxBucket, bucket);

      if (!playtimeBuckets.has(bucket)) {
        playtimeBuckets.set(bucket, new Set());
      }

      // Count unique cube events seen by this player
      const events = save.game_state?.events || {};
      Object.keys(events).forEach(eventKey => {
        if (eventKey.startsWith('cube') && events[eventKey] === true) {
          playtimeBuckets.get(bucket)!.add(save.user_id);
        }
      });
    });

    // Create array with all buckets
    const result: Array<{ time: string; players: number }> = [];
    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
      const hours = bucket / 60;
      result.push({
        time: hours === 0 ? '0h' : `${hours}h`,
        players: playtimeBuckets.get(bucket)?.size || 0,
      });
    }

    logger.log('📊 Cube events over playtime:', result.length, 'buckets');
    return result;
  };

  // Get distribution of highest cube event seen by all players
  const getHighestCubeEventDistribution = () => {
    logger.log('🔍 Getting highest cube event distribution');

    const highestCubeByPlayer = new Map<number, number>();

    gameSaves.forEach(save => {
      const events = save.game_state?.events || {};
      let highestCube = 0;

      Object.keys(events).forEach(eventKey => {
        if (eventKey.startsWith('cube') && events[eventKey] === true) {
          const cubeNum = getCubeEventNumber(eventKey);
          if (cubeNum !== null && cubeNum > highestCube) {
            highestCube = cubeNum;
          }
        }
      });

      if (highestCube > 0) {
        highestCubeByPlayer.set(highestCube, (highestCubeByPlayer.get(highestCube) || 0) + 1);
      }
    });

    // Convert to array format for chart
    const maxCube = Math.max(...Array.from(highestCubeByPlayer.keys()), 0);
    const result: Array<{ cubeEvent: string; players: number }> = [];

    for (let i = 1; i <= maxCube; i++) {
      result.push({
        cubeEvent: `Cube ${i}`,
        players: highestCubeByPlayer.get(i) || 0,
      });
    }

    logger.log('📊 Highest cube event distribution:', result.length, 'events');
    return result;
  };

  // Get top last cube events seen by churned players
  const getChurnedPlayersLastCubeEvents = () => {
    logger.log('🔍 Getting churned players last cube events');

    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    // Get churned user IDs
    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach(save => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      const hasCompletedGame = save.game_state?.events?.cube15a || save.game_state?.events?.cube15b;
      if (activityDate < cutoffDate && !hasCompletedGame) {
        churnedUserIds.add(save.user_id);
      }
    });

    logger.log('📊 Found churned users:', churnedUserIds.size);

    // Find highest cube event for each churned player
    const cubeEventCounts = new Map<number, number>();

    gameSaves.forEach(save => {
      if (churnedUserIds.has(save.user_id)) {
        const events = save.game_state?.events || {};
        let highestCube = 0;

        Object.keys(events).forEach(eventKey => {
          if (eventKey.startsWith('cube') && events[eventKey] === true) {
            const cubeNum = getCubeEventNumber(eventKey);
            if (cubeNum !== null && cubeNum > highestCube) {
              highestCube = cubeNum;
            }
          }
        });

        if (highestCube > 0) {
          cubeEventCounts.set(highestCube, (cubeEventCounts.get(highestCube) || 0) + 1);
        }
      }
    });

    // Convert to array format for chart
    const result: Array<{ cubeEvent: string; players: number }> = [];
    const sortedEntries = Array.from(cubeEventCounts.entries()).sort((a, b) => b[1] - a[1]);

    sortedEntries.forEach(([cubeNum, count]) => {
      result.push({
        cubeEvent: `Cube ${cubeNum}`,
        players: count,
      });
    });

    logger.log('📊 Last cube events for churned players:', result.length, 'events');
    return result;
  };

  // Get the top 20 buttons clicked exactly once (first-time clicks) by churned players
  const getChurnedPlayersFirstTimeClicks = () => {
    logger.log('🔍 Getting churned players first-time clicks START:', {
      now: new Date().toISOString(),
      cutoffDate: subDays(new Date(), churnDays).toISOString(),
      churnDays
    });

    const now = new Date();
    const cutoffDate = subDays(now, churnDays);

    // Get users with click data
    const usersWithClicks = new Set<string>();
    clickData.forEach(entry => usersWithClicks.add(entry.user_id));

    // Get churned user IDs based on game save activity and completion status
    const churnedUserIds = new Set<string>();
    const userLastActivity = new Map<string, Date>();

    gameSaves.forEach(save => {
      const activityDate = new Date(save.updated_at);
      const existing = userLastActivity.get(save.user_id);
      if (!existing || activityDate > existing) {
        userLastActivity.set(save.user_id, activityDate);
      }
      // Check completion status
      const hasCompletedGame = save.game_state?.events?.cube15a || save.game_state?.events?.cube15b;
      if (activityDate < cutoffDate && !hasCompletedGame && usersWithClicks.has(save.user_id)) {
        churnedUserIds.add(save.user_id);
      }
    });

    logger.log('📊 Churned user IDs for first-time clicks:', churnedUserIds.size);

    // Count buttons that were clicked exactly once across all churned players
    const buttonFirstTimeCount: Record<string, number> = {};

    clickData.forEach(entry => {
      if (churnedUserIds.has(entry.user_id)) {
        Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
          Object.entries(clicksAtTime as Record<string, number>).forEach(([button, count]) => {
            const cleanButton = cleanButtonName(button);
            // Only count if this button was clicked exactly once at this playtime
            if (count === 1) {
              buttonFirstTimeCount[cleanButton] = (buttonFirstTimeCount[cleanButton] || 0) + 1;
            }
          });
        });
      }
    });

    logger.log('📊 Total buttons with single clicks by churned users:', Object.keys(buttonFirstTimeCount).length);

    // Convert to array and sort by count, take top 20
    const topFirstTimeClicks = Object.entries(buttonFirstTimeCount)
      .map(([button, count]) => ({ button, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    logger.log('📊 Returning top 20 first-time clicked buttons:', topFirstTimeClicks.length);

    return topFirstTimeClicks;
  };

  // Get sleep upgrade levels distribution
  const getSleepUpgradesDistribution = () => {
    let filteredSaves = gameSaves;

    if (selectedUser !== 'all') {
      filteredSaves = gameSaves.filter(s => s.user_id === selectedUser);
    }

    // Filter by completed players if toggle is on
    if (showCompletedOnly) {
      const completedUserIds = new Set(
        gameSaves
          .filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b)
          .map(save => save.user_id)
      );
      filteredSaves = filteredSaves.filter(s => completedUserIds.has(s.user_id));
    }

    // Count users at each level (0-5)
    const lengthLevelCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const intensityLevelCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    filteredSaves.forEach(save => {
      const lengthLevel = save.game_state?.sleepUpgrades?.lengthLevel || 0;
      const intensityLevel = save.game_state?.sleepUpgrades?.intensityLevel || 0;

      if (lengthLevel >= 0 && lengthLevel <= 5) {
        lengthLevelCounts[lengthLevel]++;
      }
      if (intensityLevel >= 0 && intensityLevel <= 5) {
        intensityLevelCounts[intensityLevel]++;
      }
    });

    // Convert to array format for chart
    const result: Array<{ level: string; lengthUsers: number; intensityUsers: number }> = [];

    for (let level = 0; level <= 5; level++) {
      result.push({
        level: `Level ${level}`,
        lengthUsers: lengthLevelCounts[level],
        intensityUsers: intensityLevelCounts[level],
      });
    }

    return result;
  };

  const getARPU = () => {
    const totalUsers = gameSaves.length;
    if (totalUsers === 0) return 0;

    const totalRevenue = getTotalRevenue();
    return (totalRevenue / 100 / totalUsers).toFixed(2);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  // Removed !isAuthorized check as per user request
  if (!isAuthorized) {
    return null;
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];
  const MAX_LINES_IN_CHART = 5;

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto h-full p-8">
        <ScrollArea className="h-full">
          <div className="space-y-8 pr-4">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Select value={environment} onValueChange={(value: 'dev' | 'prod') => setEnvironment(value)}>
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
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value: '7d' | '30d' | 'all') => setTimeRange(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
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
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>DAU</CardTitle>
                  <CardDescription>Daily Active Users</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getDailyActiveUsers()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>WAU</CardTitle>
                  <CardDescription>Weekly Active Users</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getWeeklyActiveUsers()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>MAU</CardTitle>
                  <CardDescription>Monthly Active Users</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getMonthlyActiveUsers()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Users</CardTitle>
                  <CardDescription>All registered players</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{gameSaves.length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Avg Playtime</CardTitle>
                  <CardDescription>All players</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{formatTime(getAveragePlaytime())}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avg Time to Complete</CardTitle>
                  <CardDescription>Completed games only</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{formatTime(getAveragePlaytimeToCompletion())}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completion Rate</CardTitle>
                  <CardDescription>% of players who finished</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {gameSaves.length > 0
                      ? Math.round((gameSaves.filter(s => s.game_state?.events?.cube15a || s.game_state?.events?.cube15b).length / gameSaves.length) * 100)
                      : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate</CardTitle>
                  <CardDescription>% who made a purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getConversionRate()}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Buyers per 100</CardTitle>
                  <CardDescription>Non-free purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getBuyersPerHundred()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ARPU</CardTitle>
                  <CardDescription>Average Revenue Per User</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">€{getARPU()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                  <CardDescription>All time</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">€{(getTotalRevenue() / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Instagram Followers</CardTitle>
                  <CardDescription>Users who clicked follow button</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getInstagramFollowers()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Instagram Follow Rate</CardTitle>
                  <CardDescription>% of total users</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getInstagramFollowRate()}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Active Users (Last 30 Days)</CardTitle>
                  <CardDescription>User activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={getUserRetention()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Sign-ups (Last 30 Days)</CardTitle>
                  <CardDescription>New user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={getDailySignups()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="signups" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hourly Sign-ups (Last 24 Hours)</CardTitle>
                <CardDescription>New user registrations by hour</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getHourlySignups()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="signups" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Length Distribution</CardTitle>
                <CardDescription>How long players engage with the game</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getSessionLengthDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Average Playtime</CardTitle>
                  <CardDescription>All players</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-6xl font-bold text-center py-8">{formatTime(getAveragePlaytime())}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Time to Complete</CardTitle>
                  <CardDescription>Completed games only</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-6xl font-bold text-center py-8">{formatTime(getAveragePlaytimeToCompletion())}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clicks" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompletedOnly}
                  onChange={(e) => setShowCompletedOnly(e.target.checked)}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-medium">
                  Show only players who completed the game ({gameSaves.filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b).length} players)
                </span>
              </label>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Button Clicks Over Time</CardTitle>
                <CardDescription>
                  Total button clicks in 15-minute intervals (time elapsed since first click) {selectedUser !== 'all' ? 'for selected user' : showCompletedOnly ? 'for completed players only' : 'across all users'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getButtonClicksOverTime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" label={{ value: 'Playtime', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Clicks', angle: -90, position: 'insideLeft' }} />
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
                  Click counts by type in 15-minute intervals (time elapsed since first click) {selectedUser !== 'all' ? 'for selected user' : showCompletedOnly ? 'for completed players only' : 'across all users'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!selectedClickTypes.has('filter:cube')}
                        onChange={(e) => {
                          const newSet = new Set(selectedClickTypes);
                          if (!e.target.checked) {
                            newSet.add('filter:cube');
                          } else {
                            newSet.delete('filter:cube');
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
                        checked={!selectedClickTypes.has('filter:merchant')}
                        onChange={(e) => {
                          const newSet = new Set(selectedClickTypes);
                          if (!e.target.checked) {
                            newSet.add('filter:merchant');
                          } else {
                            newSet.delete('filter:merchant');
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
                        checked={!selectedClickTypes.has('filter:assign')}
                        onChange={(e) => {
                          const newSet = new Set(selectedClickTypes);
                          if (!e.target.checked) {
                            newSet.add('filter:assign');
                          } else {
                            newSet.delete('filter:assign');
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
                        checked={!selectedClickTypes.has('filter:choice')}
                        onChange={(e) => {
                          const newSet = new Set(selectedClickTypes);
                          if (!e.target.checked) {
                            newSet.add('filter:choice');
                          } else {
                            newSet.delete('filter:choice');
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
                    .filter(buttonName => {
                      if (selectedClickTypes.has('filter:cube') && buttonName.startsWith('cube-')) return false;
                      if (selectedClickTypes.has('filter:merchant') && buttonName.startsWith('merchant-trade')) return false;
                      if (selectedClickTypes.has('filter:assign') && (buttonName.startsWith('assign') || buttonName.startsWith('unassign'))) return false;
                      if (selectedClickTypes.has('filter:choice') && (buttonName.includes('_choice_') || buttonName.includes('-choice-'))) return false;
                      return true;
                    })
                    .map(buttonName => (
                    <label key={buttonName} className="flex items-center gap-2 cursor-pointer">
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
                    <XAxis dataKey="time" label={{ value: 'Playtime', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Clicks', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {(() => {
                      const chartData = getClickTypesByTimestamp();
                      // Collect all unique keys across all data points, not just the first one
                      const allKeys = new Set<string>();
                      chartData.forEach(dataPoint => {
                        Object.keys(dataPoint).forEach(key => {
                          if (key !== 'time') {
                            allKeys.add(key);
                          }
                        });
                      });
                      const dataKeys = Array.from(allKeys);
                      logger.log('📈 Chart rendering with data keys:', dataKeys);
                      logger.log('📈 Sample data point:', chartData[0]);
                      logger.log('📈 All data points checked:', chartData.length);
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
                    <XAxis dataKey="button" angle={-45} textAnchor="end" height={100} />
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
                <CardDescription>Average clicks per user who clicked each button (top 15)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getAverageClicksByButton()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="button" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completion" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{gameSaves.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completed Game</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {gameSaves.filter(s => s.game_state?.events?.cube15a || s.game_state?.events?.cube15b).length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {gameSaves.length > 0
                      ? Math.round((gameSaves.filter(s => s.game_state?.events?.cube15a || s.game_state?.events?.cube15b).length / gameSaves.length) * 100)
                      : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Game Completion Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getGameCompletionStats()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getGameCompletionStats().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">€{(getTotalRevenue() / 100).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Purchases</CardTitle>
                  <CardDescription>Excluding free items</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{purchases.filter(p => p.price_paid > 0).length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Purchases (Last 30 Days)</CardTitle>
                <CardDescription>Purchase activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={getDailyPurchases()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="purchases" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Purchases by Playtime</CardTitle>
                <CardDescription>When do players make purchases? (hourly intervals, excluding free items)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getPurchasesByPlaytime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="playtime" label={{ value: 'Playtime (hours)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Purchases', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="purchases" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Purchases by Item</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getPurchaseStats()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {purchases.slice(0, 10).map((purchase, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{purchase.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(purchase.purchased_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-bold">€{(purchase.price_paid / 100).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Referrals</CardTitle>
                  <CardDescription>All time</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getTotalReferrals()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Users with Referrals</CardTitle>
                  <CardDescription>Players who referred others</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {gameSaves.filter(s => (s.game_state?.referrals || []).length > 0).length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avg Referrals per User</CardTitle>
                  <CardDescription>Among users with referrals</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {gameSaves.filter(s => (s.game_state?.referrals || []).length > 0).length > 0
                      ? (getTotalReferrals() / gameSaves.filter(s => (s.game_state?.referrals || []).length > 0).length).toFixed(1)
                      : 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Referrals (Last 30 Days)</CardTitle>
                <CardDescription>New referrals over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={getDailyReferrals()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="referrals" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>Users who referred the most players</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getTopReferrers()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userId" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium">Churn definition (inactive for at least):</label>
              <Select value={churnDays.toString()} onValueChange={(value) => setChurnDays(parseInt(value) as 1 | 3 | 5 | 7)}>
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
                  <CardDescription>Players inactive for {churnDays}+ days and did not complete the game</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{getChurnedPlayers().length}</p>
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
                      ? Math.round((getChurnedPlayers().length / gameSaves.length) * 100)
                      : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Churned Players List</CardTitle>
                <CardDescription>Players who stopped playing (sorted by inactivity)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getChurnedPlayers().map((player, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{player.userId}</p>
                        <p className="text-sm text-muted-foreground">
                          Last activity: {format(player.lastActivity, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <p className="font-bold text-red-500">{player.daysSinceActivity} days ago</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 20 Last Buttons Clicked Before Churning</CardTitle>
                <CardDescription>What were the last actions churned players performed at their final playtime?</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getChurnedPlayersLastClicks()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="button" angle={-45} textAnchor="end" height={100} />
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
                <CardDescription>Buttons clicked exactly once (count = 1) - what did churned players try just once?</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getChurnedPlayersFirstTimeClicks()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="button" angle={-45} textAnchor="end" height={100} />
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
                <CardDescription>Number of players who have seen cube events at each playtime</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getCubeEventsOverPlaytime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" label={{ value: 'Playtime', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Players', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="players" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Highest Cube Event Distribution</CardTitle>
                <CardDescription>What is the highest cube event players have seen?</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getHighestCubeEventDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cubeEvent" label={{ value: 'Cube Event', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Players', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="players" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last Cube Events for Churned Players</CardTitle>
                <CardDescription>What was the highest cube event churned players saw before leaving?</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getChurnedPlayersLastCubeEvents()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cubeEvent" label={{ value: 'Cube Event', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Players', angle: -90, position: 'insideLeft' }} />
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
                <CardDescription>At what playtime did churned players stop playing?</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={(() => {
                    const now = new Date();
                    const cutoffDate = subDays(now, churnDays);

                    // Get users with click data
                    const usersWithClicks = new Set<string>();
                    clickData.forEach(entry => usersWithClicks.add(entry.user_id));

                    // Get churned user IDs based on game save activity and completion status
                    const churnedUserIds = new Set<string>();
                    const userLastActivity = new Map<string, Date>();

                    gameSaves.forEach(save => {
                      const activityDate = new Date(save.updated_at);
                      const existing = userLastActivity.get(save.user_id);
                      if (!existing || activityDate > existing) {
                        userLastActivity.set(save.user_id, activityDate);
                      }
                      // Check completion status
                      const hasCompletedGame = save.game_state?.events?.cube15a || save.game_state?.events?.cube15b;
                      if (activityDate < cutoffDate && !hasCompletedGame && usersWithClicks.has(save.user_id)) {
                        churnedUserIds.add(save.user_id);
                      }
                    });

                    // Get max playtime for each churned user
                    const userMaxPlaytime = new Map<string, number>();
                    clickData.forEach(entry => {
                      if (churnedUserIds.has(entry.user_id)) {
                        Object.keys(entry.clicks).forEach(playtimeKey => {
                          const minutes = parseInt(playtimeKey.replace('m', ''));
                          if (!isNaN(minutes)) {
                            const existing = userMaxPlaytime.get(entry.user_id) || 0;
                            if (minutes > existing) {
                              userMaxPlaytime.set(entry.user_id, minutes);
                            }
                          }
                        });
                      }
                    });

                    // Group into 1-hour buckets
                    const buckets = new Map<number, number>();
                    let maxBucket = 0;

                    userMaxPlaytime.forEach((minutes) => {
                      const bucket = Math.floor(minutes / 60) * 60; // 60-minute buckets
                      maxBucket = Math.max(maxBucket, bucket);
                      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
                    });

                    // Create array with all buckets from 0 to max
                    const result: Array<{ time: string; count: number }> = [];
                    for (let bucket = 0; bucket <= maxBucket; bucket += 60) {
                      const hours = bucket / 60;
                      result.push({
                        time: hours === 0 ? '0h' : `${hours}h`,
                        count: buckets.get(bucket) || 0,
                      });
                    }

                    return result;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" label={{ value: 'Playtime', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Players', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#ff8042" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sleep" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompletedOnly}
                  onChange={(e) => setShowCompletedOnly(e.target.checked)}
                  className="cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-medium">
                  Show only players who completed the game ({gameSaves.filter(save => save.game_state?.events?.cube15a || save.game_state?.events?.cube15b).length} players)
                </span>
              </label>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sleep Upgrade Levels Distribution</CardTitle>
                <CardDescription>
                  Number of users at each SLEEP_LENGTH_UPGRADES and SLEEP_INTENSITY_UPGRADES level {selectedUser !== 'all' ? 'for selected user' : showCompletedOnly ? 'for completed players only' : 'across all users'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getSleepUpgradesDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="level" 
                      label={{ value: 'Upgrade Level', position: 'insideBottom', offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: 'Number of Users', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="lengthUsers"
                      fill="#8884d8"
                      name="Sleep Length Users"
                    />
                    <Bar
                      dataKey="intensityUsers"
                      fill="#82ca9d"
                      name="Sleep Intensity Users"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Average Sleep Length Level</CardTitle>
                  <CardDescription>All players</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-center py-8">
                    {gameSaves.length > 0
                      ? (
                          gameSaves.reduce(
                            (sum, save) => sum + (save.game_state?.sleepUpgrades?.lengthLevel || 0),
                            0
                          ) / gameSaves.length
                        ).toFixed(2)
                      : '0.00'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Sleep Intensity Level</CardTitle>
                  <CardDescription>All players</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-center py-8">
                    {gameSaves.length > 0
                      ? (
                          gameSaves.reduce(
                            (sum, save) => sum + (save.game_state?.sleepUpgrades?.intensityLevel || 0),
                            0
                          ) / gameSaves.length
                        ).toFixed(2)
                      : '0.00'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}