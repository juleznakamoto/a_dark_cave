
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
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
  startOfDay,
  endOfDay,
  format,
  isWithinInterval,
  parseISO
} from 'date-fns';

interface ButtonClickData {
  user_id: string;
  clicks: Record<string, number>;
  timestamp: string;
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

// Admin emails from environment variable
const getAdminEmails = (): string[] => {
  const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || '';
  return adminEmailsEnv.split(',').map(email => email.trim()).filter(Boolean);
};

// Helper function to clean button names
const cleanButtonName = (buttonName: string): string => {
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
  const [selectedButtons, setSelectedButtons] = useState<Set<string>>(new Set(['mine', 'hunt', 'chopWood', 'caveExplore']));
  const [selectedClickTypes, setSelectedClickTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    initializeAdminDashboard();
  }, []);

  const initializeAdminDashboard = async () => {
    try {
      console.log('Initializing admin dashboard...');
      
      // Step 1: Check authentication using main app client
      const { getSupabaseClient } = await import('@/lib/supabase');
      const mainClient = await getSupabaseClient();
      const { data: { user } } = await mainClient.auth.getUser();

      const adminEmails = getAdminEmails();
      if (!user || !adminEmails.includes(user.email || '')) {
        console.log('User not authorized for admin dashboard');
        setLoading(false);
        setLocation('/');
        return;
      }

      console.log('User authorized:', user.email);
      setIsAuthorized(true);

      // Step 2: Get database credentials
      let supabaseUrl: string;
      let supabaseAnonKey: string;

      if (import.meta.env.PROD) {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to load production config');
        }
        const config = await response.json();
        supabaseUrl = config.supabaseUrl;
        supabaseAnonKey = config.supabaseAnonKey;
        console.log('Loaded production credentials from server');
      } else {
        supabaseUrl = import.meta.env.VITE_SUPABASE_URL_PROD;
        supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_PROD;
        console.log('Loaded production credentials from env');
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing database credentials');
      }

      console.log('Database URL:', supabaseUrl.substring(0, 30) + '...');

      // Step 3: Load data using direct REST API calls
      await loadDashboardData(supabaseUrl, supabaseAnonKey);

      setLoading(false);
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      setLoading(false);
      alert('Failed to initialize admin dashboard. Check console for details.');
    }
  };

  const loadDashboardData = async (supabaseUrl: string, apiKey: string) => {
    try {
      console.log('Loading dashboard data via REST API...');

      const headers = {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      // Load button clicks
      const clicksResponse = await fetch(
        `${supabaseUrl}/rest/v1/button_clicks?select=user_id,clicks,timestamp&order=timestamp.asc`,
        { headers }
      );

      if (!clicksResponse.ok) {
        const errorText = await clicksResponse.text();
        console.error('Clicks fetch failed:', clicksResponse.status, errorText);
        throw new Error(`Failed to load clicks: ${clicksResponse.status}`);
      }

      const clicks = await clicksResponse.json();
      console.log('Loaded clicks:', clicks?.length || 0);
      if (clicks) setClickData(clicks);

      // Load game saves
      const savesResponse = await fetch(
        `${supabaseUrl}/rest/v1/game_saves?select=user_id,game_state,updated_at,created_at`,
        { headers }
      );

      if (!savesResponse.ok) {
        const errorText = await savesResponse.text();
        console.error('Saves fetch failed:', savesResponse.status, errorText);
        throw new Error(`Failed to load saves: ${savesResponse.status}`);
      }

      const saves = await savesResponse.json();
      console.log('Loaded saves:', saves?.length || 0);
      if (saves) setGameSaves(saves);

      // Load purchases
      const purchasesResponse = await fetch(
        `${supabaseUrl}/rest/v1/purchases?select=*&order=purchased_at.desc`,
        { headers }
      );

      if (!purchasesResponse.ok) {
        const errorText = await purchasesResponse.text();
        console.error('Purchases fetch failed:', purchasesResponse.status, errorText);
        throw new Error(`Failed to load purchases: ${purchasesResponse.status}`);
      }

      const purchaseData = await purchasesResponse.json();
      console.log('Loaded purchases:', purchaseData?.length || 0);
      if (purchaseData) setPurchases(purchaseData);

      // Collect unique users
      const uniqueUserIds = new Set<string>();
      clicks?.forEach(c => c.user_id && uniqueUserIds.add(c.user_id));
      saves?.forEach(s => s.user_id && uniqueUserIds.add(s.user_id));
      purchaseData?.forEach(p => p.user_id && uniqueUserIds.add(p.user_id));

      console.log('Total unique users:', uniqueUserIds.size);

      const userList = Array.from(uniqueUserIds).map(id => ({
        id,
        email: id.substring(0, 8) + '...',
      }));

      setUsers(userList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      throw error;
    }
  };

  // Process clicks data for the chart
  const buttonClicksChartData = useMemo(() => {
    if (!clickData) return [];

    let filteredClicks = clickData;
    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    const totalClicks: Record<string, number> = {};

    filteredClicks.forEach(record => {
      Object.values(record.clicks).forEach((playtimeClicks: any) => {
        Object.entries(playtimeClicks).forEach(([button, count]) => {
          const cleanButton = cleanButtonName(button);
          totalClicks[cleanButton] = (totalClicks[cleanButton] || 0) + (count as number);
        });
      });
    });

    return Object.entries(totalClicks)
      .map(([button, clicks]) => ({ button, clicks }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [clickData, selectedUser]);

  // Analytics functions
  const getActiveUsers = (days: number) => {
    const now = new Date();
    const cutoffDate = subDays(now, days);
    const activeUserIds = new Set<string>();

    clickData.forEach(entry => {
      const entryDate = parseISO(entry.timestamp);
      if (entryDate >= cutoffDate) {
        activeUserIds.add(entry.user_id);
      }
    });

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

  const getAveragePlaytime = () => {
    const playtimes = gameSaves
      .map(save => save.game_state?.playTime || 0)
      .filter(time => time > 0);

    if (playtimes.length === 0) return 0;

    const avgMs = playtimes.reduce((sum, time) => sum + time, 0) / playtimes.length;
    return Math.round(avgMs / 1000 / 60);
  };

  const getAveragePlaytimeToCompletion = () => {
    const completedGames = gameSaves.filter(save => save.game_state?.showEndScreen === true);
    if (completedGames.length === 0) return 0;

    const playtimes = completedGames
      .map(save => save.game_state?.playTime || 0)
      .filter(time => time > 0);

    if (playtimes.length === 0) return 0;

    const avgMs = playtimes.reduce((sum, time) => sum + time, 0) / playtimes.length;
    return Math.round(avgMs / 1000 / 60);
  };

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

  const getButtonClicksOverTime = () => {
    let filteredClicks = clickData;
    if (selectedUser !== 'all') {
      filteredClicks = clickData.filter(d => d.user_id === selectedUser);
    }

    const playtimeData = new Map<number, number>();

    filteredClicks.forEach(entry => {
      Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
        try {
          const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(playtimeMinutes)) {
            const totalClicks = Object.values(clicksAtTime as Record<string, number>).reduce((sum, count) => sum + count, 0);
            const bucket = Math.floor(playtimeMinutes / 15) * 15;
            playtimeData.set(bucket, (playtimeData.get(bucket) || 0) + totalClicks);
          }
        } catch (e) {
          console.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    if (playtimeData.size === 0) return [];

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

    const buckets = new Map<number, Record<string, number>>();

    filteredClicks.forEach(entry => {
      Object.entries(entry.clicks).forEach(([playtimeKey, clicksAtTime]: [string, any]) => {
        try {
          const playtimeMinutes = parseInt(playtimeKey.replace('m', ''));
          if (!isNaN(playtimeMinutes)) {
            const bucket = Math.floor(playtimeMinutes / 5) * 5;

            if (!buckets.has(bucket)) {
              buckets.set(bucket, {});
            }

            const bucketData = buckets.get(bucket)!;
            Object.entries(clicksAtTime as Record<string, number>).forEach(([button, count]) => {
              const cleanButton = cleanButtonName(button);
              if (selectedClickTypes.size === 0 || selectedClickTypes.has(cleanButton)) {
                bucketData[cleanButton] = (bucketData[cleanButton] || 0) + (count as number);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to parse playtime:', playtimeKey, e);
        }
      });
    });

    if (buckets.size === 0) return [];

    const maxBucket = Math.max(...Array.from(buckets.keys()));
    const result: Array<{ time: string; [key: string]: any }> = [];

    for (let bucket = 0; bucket <= maxBucket; bucket += 5) {
      const bucketData = buckets.get(bucket) || {};
      result.push({
        time: `${bucket}m`,
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
      .slice(0, 15);
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
        <div className="text-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

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
                      Total button clicks in 15-minute intervals {selectedUser !== 'all' ? 'for selected user' : 'across all users'}
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
                      Click counts by type in 5-minute intervals {selectedUser !== 'all' ? 'for selected user' : 'across all users'}
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
                        {Object.keys(getClickTypesByTimestamp()[0] || {})
                          .filter(key => key !== 'time')
                          .map((key, index) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stroke={COLORS[index % COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
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
