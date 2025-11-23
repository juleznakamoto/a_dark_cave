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

  // Process clicks data for the chart - moved here before any early returns
  const buttonClicksChartData = useMemo(() => {
    if (!clickData) return [];

    // Aggregate total clicks per button across all users
    const totalClicks: Record<string, number> = {};

    clickData.forEach(record => {
      // Check if clicks is in new timestamp format
      const isTimestampFormat = Object.keys(record.clicks).some(key => 
        key.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      );

      if (isTimestampFormat) {
        // New format: { "timestamp": { "button": count } }
        Object.values(record.clicks).forEach((timestampClicks: any) => {
          Object.entries(timestampClicks).forEach(([button, count]) => {
            totalClicks[button] = (totalClicks[button] || 0) + (count as number);
          });
        });
      } else {
        // Old format: { "button": count }
        Object.entries(record.clicks).forEach(([button, count]) => {
          totalClicks[button] = (totalClicks[button] || 0) + (count as number);
        });
      }
    });

    // Convert to array format for the chart
    return Object.entries(totalClicks)
      .map(([button, clicks]) => ({
        button,
        clicks
      }))
      .sort((a, b) => b.clicks - a.clicks); // Sort by most clicked
  }, [clickData]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

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
      console.error('Auth check failed:', error);
      setLoading(false);
      setLocation('/');
    }
  };

  // Renamed from loadDashboardData to loadData
  const loadData = async () => {
    const supabase = await getSupabaseClient();

    // Load button clicks
    const { data: clicks } = await supabase
      .from('button_clicks')
      .select('*')
      .order('timestamp', { ascending: true }); // Keep order for potential future use, though not used in current chart logic

    if (clicks) setClickData(clicks);

    // Load game saves with created_at
    const { data: saves } = await supabase
      .from('game_saves')
      .select('user_id, game_state, updated_at, created_at');

    if (saves) setGameSaves(saves);

    // Load purchases
    const { data: purchaseData } = await supabase
      .from('purchases')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (purchaseData) setPurchases(purchaseData);

    // Load unique users
    const uniqueUserIds = new Set<string>();
    if (clicks) clicks.forEach(c => uniqueUserIds.add(c.user_id));
    if (saves) saves.forEach(s => uniqueUserIds.add(s.user_id));
    if (purchaseData) purchaseData.forEach(p => uniqueUserIds.add(p.user_id));

    const userList = Array.from(uniqueUserIds).map(id => ({
      id,
      email: id.substring(0, 8) + '...', // Truncated for privacy
    }));

    setUsers(userList);
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
    const completedGames = gameSaves.filter(save => save.game_state?.showEndScreen === true);

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

  // Process data for charts
  const getButtonClicksOverTime = () => {
    let filteredClicks = clickData;

    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    // Filter by time range
    const now = new Date();
    let startDate = new Date();
    if (timeRange === '7d') {
      startDate = subDays(now, 7);
    } else if (timeRange === '30d') {
      startDate = subDays(now, 30);
    } else { // 'all'
      startDate = new Date(0);
    }

    const timeSeriesMap = new Map<string, Record<string, number>>();

    filteredClicks.forEach(entry => {
      // Check if clicks is in new timestamp format
      const isTimestampFormat = Object.keys(entry.clicks).some(key => 
        key.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      );

      if (isTimestampFormat) {
        // New format: { "timestamp": { "button": count } }
        Object.entries(entry.clicks).forEach(([timestamp, clicksAtTime]: [string, any]) => {
          const clickDate = parseISO(timestamp);
          
          if (clickDate >= startDate) {
            const date = clickDate.toLocaleDateString();
            const existing = timeSeriesMap.get(date) || {};

            Object.entries(clicksAtTime).forEach(([button, count]) => {
              if (selectedButtons.size === 0 || selectedButtons.has(button)) {
                existing[button] = (existing[button] || 0) + (count as number);
              }
            });

            timeSeriesMap.set(date, existing);
          }
        });
      } else {
        // Old format: { "button": count }
        const entryDate = parseISO(entry.timestamp);
        if (entryDate >= startDate) {
          const date = entryDate.toLocaleDateString();
          const existing = timeSeriesMap.get(date) || {};

          Object.entries(entry.clicks).forEach(([button, count]) => {
            if (selectedButtons.size === 0 || selectedButtons.has(button)) {
              existing[button] = (existing[button] || 0) + (count as number);
            }
          });

          timeSeriesMap.set(date, existing);
        }
      }
    });

    return Array.from(timeSeriesMap.entries()).map(([date, clicks]) => ({
      date,
      ...clicks,
    }));
  };

  const getAllButtonNames = (): string[] => {
    const buttonNames = new Set<string>();
    clickData.forEach(entry => {
      // Check if clicks is in new timestamp format
      const isTimestampFormat = Object.keys(entry.clicks).some(key => 
        key.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      );

      if (isTimestampFormat) {
        // New format: { "timestamp": { "button": count } }
        Object.values(entry.clicks).forEach((timestampClicks: any) => {
          Object.keys(timestampClicks).forEach(button => buttonNames.add(button));
        });
      } else {
        // Old format: { "button": count }
        Object.keys(entry.clicks).forEach(button => buttonNames.add(button));
      }
    });
    return Array.from(buttonNames);
  };

  const getButtonClicksOverPlaytime = () => {
    let filteredClicks = clickData;

    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    // Aggregate clicks by playtime buckets across all users (every 10 minutes)
    const playtimeBuckets = new Map<number, Record<string, number>>();

    filteredClicks.forEach(entry => {
      const userId = entry.user_id;
      
      // Find the corresponding game save to get current playtime
      const userSave = gameSaves.find(save => save.user_id === userId);
      const currentPlaytime = userSave?.game_state?.playTime || 0;
      const playtimeMinutes = Math.round(currentPlaytime / 1000 / 60);

      // Check if clicks is in new timestamp format
      const isTimestampFormat = Object.keys(entry.clicks).some(key => 
        key.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      );

      if (isTimestampFormat) {
        // New format: { "timestamp": { "button": count } }
        // Process each timestamp entry
        Object.entries(entry.clicks).forEach(([timestamp, clicksAtTime]: [string, any]) => {
          const bucket = Math.floor(playtimeMinutes / 10) * 10; // 10-minute buckets

          if (!playtimeBuckets.has(bucket)) {
            playtimeBuckets.set(bucket, {});
          }

          const bucketData = playtimeBuckets.get(bucket)!;

          Object.entries(clicksAtTime).forEach(([button, count]) => {
            if (selectedButtons.size === 0 || selectedButtons.has(button)) {
              bucketData[button] = (bucketData[button] || 0) + (count as number);
            }
          });
        });
      } else {
        // Old format: { "button": count }
        const bucket = Math.floor(playtimeMinutes / 10) * 10; // 10-minute buckets

        if (!playtimeBuckets.has(bucket)) {
          playtimeBuckets.set(bucket, {});
        }

        const bucketData = playtimeBuckets.get(bucket)!;

        Object.entries(entry.clicks).forEach(([button, count]) => {
          if (selectedButtons.size === 0 || selectedButtons.has(button)) {
            bucketData[button] = (bucketData[button] || 0) + (count as number);
          }
        });
      }
    });

    // Convert to array and sort by playtime
    return Array.from(playtimeBuckets.entries())
      .map(([playtime, clicks]) => ({
        playtime: `${playtime}m`,
        ...clicks,
      }))
      .sort((a, b) => parseInt(a.playtime) - parseInt(b.playtime));
  };


  const getTotalClicksByButton = () => {
    const filtered = selectedUser === 'all'
      ? clickData
      : clickData.filter(d => d.user_id === selectedUser);

    const totals: Record<string, number> = {};

    filtered.forEach(entry => {
      // Check if clicks is in new timestamp format
      const isTimestampFormat = Object.keys(entry.clicks).some(key => 
        key.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      );

      if (isTimestampFormat) {
        // New format: { "timestamp": { "button": count } }
        Object.values(entry.clicks).forEach((timestampClicks: any) => {
          Object.entries(timestampClicks).forEach(([button, count]) => {
            totals[button] = (totals[button] || 0) + (count as number);
          });
        });
      } else {
        // Old format: { "button": count }
        Object.entries(entry.clicks).forEach(([button, count]) => {
          totals[button] = (totals[button] || 0) + (count as number);
        });
      }
    });

    return Object.entries(totals)
      .map(([button, total]) => ({ button, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15); // Top 15 buttons
  };

  const getGameCompletionStats = () => {
    const completed = gameSaves.filter(save =>
      save.game_state?.showEndScreen === true
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
    const payingUsers = new Set(purchases.map(p => p.user_id)).size;

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
            <TabsTrigger value="playtime">Playtime Analysis</TabsTrigger>
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
                      ? Math.round((gameSaves.filter(s => s.game_state?.showEndScreen).length / gameSaves.length) * 100)
                      : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Daily aggregated button clicks {selectedUser !== 'all' ? 'for selected user' : 'across all users'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getButtonClicksOverTime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.keys(getButtonClicksOverTime()[0] || {})
                      .filter(key => key !== 'date' && (selectedButtons.size === 0 || selectedButtons.has(key)))
                      .slice(0, MAX_LINES_IN_CHART)
                      .map((key, index) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={COLORS[index % COLORS.length]}
                        />
                      ))}
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

          <TabsContent value="playtime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Button Clicks Over Playtime</CardTitle>
                <CardDescription>
                  Aggregated button clicks over playtime {selectedUser !== 'all' ? 'for selected user' : 'across all users'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
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
                  <Select onValueChange={(value: string) => {
                    const newSelectedButtons = new Set<string>(['all'].includes(value) ? [] : [value]);
                    setSelectedButtons(newSelectedButtons);
                  }} defaultValue={selectedButtons.size === 0 ? 'all' : Array.from(selectedButtons)[0]}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select button" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buttons</SelectItem>
                      {getAllButtonNames().map(buttonName => (
                        <SelectItem key={buttonName} value={buttonName}>
                          {buttonName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getButtonClicksOverPlaytime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="playtime" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.keys(getButtonClicksOverPlaytime()[0] || {})
                      .filter(key => key !== 'playtime' && (selectedButtons.size === 0 || selectedButtons.has(key)))
                      .slice(0, MAX_LINES_IN_CHART)
                      .map((key, index) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={COLORS[index % COLORS.length]}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Button Clicks</CardTitle>
                <CardDescription>
                  Cumulative clicks for each button type across all players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={buttonClicksChartConfig} className="h-[400px]">
                  <BarChart data={buttonClicksChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="button"
                      label={{ value: 'Button Type', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: 'Total Clicks', angle: -90, position: 'insideLeft' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clicks" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
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
                    {gameSaves.filter(s => s.game_state?.showEndScreen).length}
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
                      ? Math.round((gameSaves.filter(s => s.game_state?.showEndScreen).length / gameSaves.length) * 100)
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