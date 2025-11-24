import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
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

// Helper function to clean button names by removing timestamp/random suffixes
const cleanButtonName = (buttonName: string): string => {
  // Remove patterns like _1763918279318_0.004097622888011188
  return buttonName.replace(/_\d+_[\d.]+$/, '');
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

  // Process clicks data for the chart - moved here before any early returns
  const buttonClicksChartData = useMemo(() => {
    if (!clickData) return [];

    // Filter by selected user
    let filteredClicks = clickData;
    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
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
    console.log('🚀 AdminDashboard component mounted - starting auth check...');
    checkAdminAccess();
  }, []);

  // Reload data when environment changes
  useEffect(() => {
    if (isAuthorized) {
      console.log(`🔄 Environment effect triggered. Current environment: ${environment.toUpperCase()}`);
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [environment]);

  const checkAdminAccess = async () => {
    try {
      console.log('🔐 Checking admin access...');
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const adminEmails = getAdminEmails();

      if (!user || !adminEmails.includes(user.email || '')) {
        console.log('❌ Access denied');
        setLoading(false);
        setLocation('/');
        return;
      }

      console.log('✅ Access granted for:', user.email);
      setIsAuthorized(true);
      await loadData();
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
      setLocation('/');
    }
  };

  // Renamed from loadDashboardData to loadData
  const loadData = async () => {
    try {
      console.log(`📡 Fetching data from ${environment.toUpperCase()} environment...`);
      console.log(`   Request URL: /api/admin/data?env=${environment}`);
      const response = await fetch(`/api/admin/data?env=${environment}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin data fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch admin data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Received data:', {
        clicks: data.clicks?.length || 0,
        saves: data.saves?.length || 0,
        purchases: data.purchases?.length || 0
      });

      // Log sample click data structure
      if (data.clicks && data.clicks.length > 0) {
        console.log('🔍 Sample click data structure:', {
          firstRecord: data.clicks[0],
          clicksKeys: Object.keys(data.clicks[0].clicks || {}),
          samplePlaytimeEntry: Object.entries(data.clicks[0].clicks || {})[0]
        });
      }

      // Set the data
      if (data.clicks) {
        setClickData(data.clicks);
        console.log('✅ Click data set:', data.clicks.length, 'records');
      }
      if (data.saves) {
        setGameSaves(data.saves);
        console.log('✅ Game saves set:', data.saves.length, 'records');
      }
      if (data.purchases) {
        setPurchases(data.purchases);
        console.log('✅ Purchases set:', data.purchases.length, 'records');
      }

      // Collect all unique user IDs
      const uniqueUserIds = new Set<string>();

      // Add users from all sources
      data.saves?.forEach((s: any) => uniqueUserIds.add(s.user_id));
      data.clicks?.forEach((c: any) => uniqueUserIds.add(c.user_id));
      data.purchases?.forEach((p: any) => uniqueUserIds.add(p.user_id));

      const userList = Array.from(uniqueUserIds).map(id => ({
        id,
        email: id.substring(0, 8) + '...', // Truncated for privacy
      }));

      setUsers(userList);
      console.log('✅ Users set:', userList.length, 'users');
    } catch (error) {
      console.error('Failed to load admin data:', error);
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

            // Aggregate into 15-minute buckets
            const bucket = Math.floor(playtimeMinutes / 15) * 15;
            playtimeData.set(bucket, (playtimeData.get(bucket) || 0) + totalClicks);
          }
        } catch (e) {
          console.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    if (playtimeData.size === 0) return [];

    // Convert to array and format for chart display
    const maxBucket = Math.max(...Array.from(playtimeData.keys()));
    const result: Array<{ time: string; clicks: number }> = [];

    for (let bucket = 0; bucket <= maxBucket; bucket += 15) {
      result.push({
        time: `${bucket}m`,
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
    console.log('📊 Processing click types by timestamp...');
    console.log('   Click data records:', clickData.length);
    console.log('   Selected user:', selectedUser);
    console.log('   Selected click types:', Array.from(selectedClickTypes));

    let filteredClicks = clickData;

    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
      console.log('   Filtered to user:', filteredClicks.length, 'records');
    }

    // Collect all unique button names in the data
    const allButtonsInData = new Set<string>();
    const miningClickDetails: any[] = [];
    filteredClicks.forEach(entry => {
      Object.entries(entry.clicks).forEach(([playtimeKey, playtimeClicks]: [string, any]) => {
        Object.keys(playtimeClicks).forEach(button => {
          const cleanButton = cleanButtonName(button);
          allButtonsInData.add(cleanButton);
          // Track mining clicks (mineStone, mineIron, etc.)
          if (cleanButton.startsWith('mine')) {
            miningClickDetails.push({ 
              playtimeKey, 
              rawButton: button,
              cleanButton: cleanButton,
              clicks: playtimeClicks[button],
              bucket: Math.floor(parseInt(playtimeKey.replace('m', '')) / 15) * 15
            });
          }
        });
      });
    });
    console.log('   All button names in data:', Array.from(allButtonsInData));
    console.log('   ⛏️ Mining click details:', miningClickDetails);
    console.log('   ⛏️ Mining clicks by type:', miningClickDetails.reduce((acc, item) => {
      if (!acc[item.cleanButton]) acc[item.cleanButton] = { raw: item.rawButton, total: 0 };
      acc[item.cleanButton].total += item.clicks;
      return acc;
    }, {} as Record<string, any>));

    // Aggregate into 15-minute buckets
    const buckets = new Map<number, Record<string, number>>();
    let maxBucket = 0;

    filteredClicks.forEach((entry, index) => {
      if (index === 0) {
        console.log('   First entry clicks structure:', entry.clicks);
      }
      
      // Format: { "playtime_minutes": { "button": count } }
      Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
        try {
          // Extract playtime from key like "45m"
          const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(playtimeMinutes)) {
            const bucket = Math.floor(playtimeMinutes / 15) * 15; // 15-minute buckets
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
          console.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    console.log('   Buckets created:', buckets.size);
    console.log('   Max bucket:', maxBucket);

    if (buckets.size === 0) {
      console.log('   ⚠️ No buckets created, returning empty array');
      return [];
    }

    // Convert to array and format for chart display
    const result: Array<{ time: string; [key: string]: any }> = [];

    for (let bucket = 0; bucket <= maxBucket; bucket += 15) {
      const bucketData = buckets.get(bucket) || {};
      result.push({
        time: `${bucket}m`,
        ...bucketData,
      });
    }

    console.log('   Result array length:', result.length);
    console.log('   Sample result entry:', result[0]);
    console.log('   Result keys:', result.length > 0 ? Object.keys(result[0]) : []);
    console.log('   All unique keys across all results:', Array.from(new Set(result.flatMap(r => Object.keys(r)))));
    console.log('   Sample entries with data:', result.filter(r => Object.keys(r).length > 1).slice(0, 3));

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
          console.warn('Failed to parse playtime:', playtimeKey, e);
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
    const filtered = selectedUser === 'all'
      ? clickData
      : clickData.filter(d => d.user_id === selectedUser);

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
    const stats = purchases.reduce((acc, purchase) => {
      acc[purchase.item_name] = (acc[purchase.item_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  const getTotalRevenue = () => {
    return purchases.reduce((sum, p) => sum + p.price_paid, 0);
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
            <Card>
              <CardHeader>
                <CardTitle>Button Clicks Over Time</CardTitle>
                <CardDescription>
                  Total button clicks in 15-minute intervals (time elapsed since first click) {selectedUser !== 'all' ? 'for selected user' : 'across all users'}
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
                  Click counts by type in 15-minute intervals (time elapsed since first click) {selectedUser !== 'all' ? 'for selected user' : 'across all users'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4 flex-wrap">
                  {getAllButtonNames().map(buttonName => (
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
                      console.log('📈 Chart rendering with data keys:', dataKeys);
                      console.log('📈 Sample data point:', chartData[0]);
                      console.log('📈 All data points checked:', chartData.length);
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
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{purchases.length}</p>
                </CardContent>
              </Card>
            </div>

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
        </Tabs>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}