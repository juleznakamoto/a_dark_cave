
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { createClient } from '@supabase/supabase-js';
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

const getAdminEmails = (): string[] => {
  const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || '';
  return adminEmailsEnv.split(',').map(email => email.trim()).filter(Boolean);
};

const cleanButtonName = (buttonName: string): string => {
  return buttonName.replace(/_\d+_[\d.]+$/, '');
};

export default function AdminDashboardDev() {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [clickData, setClickData] = useState<ButtonClickData[]>([]);
  const [gameSaves, setGameSaves] = useState<GameSaveData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedButtons, setSelectedButtons] = useState<Set<string>>(new Set(['mine', 'hunt', 'chopWood', 'caveExplore']));
  const [selectedClickTypes, setSelectedClickTypes] = useState<Set<string>>(new Set());

  // Create DEV Supabase client
  const supabase = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL_DEV;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_DEV;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('DEV Supabase configuration is missing.');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storageKey: 'a-dark-cave-admin-dashboard-dev'
      }
    });
  }, []);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
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

  const loadData = async () => {
    const { data: clicks } = await supabase
      .from('button_clicks')
      .select('*')
      .order('timestamp', { ascending: true });

    if (clicks) setClickData(clicks);

    const { data: saves } = await supabase
      .from('game_saves')
      .select('user_id, game_state, updated_at, created_at');

    if (saves) setGameSaves(saves);

    const { data: purchaseData } = await supabase
      .from('purchases')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (purchaseData) setPurchases(purchaseData);

    const uniqueUserIds = new Set<string>();
    if (clicks) clicks.forEach(c => uniqueUserIds.add(c.user_id));
    if (saves) saves.forEach(s => uniqueUserIds.add(s.user_id));
    if (purchaseData) purchaseData.forEach(p => uniqueUserIds.add(p.user_id));

    const userList = Array.from(uniqueUserIds).map(id => ({
      id,
      email: id.substring(0, 8) + '...',
    }));

    setUsers(userList);
  };

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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-foreground">Loading DEV Dashboard...</div>
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
              <h1 className="text-4xl font-bold">Admin Dashboard (DEV)</h1>
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
            </div>

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

            <Card>
              <CardHeader>
                <CardTitle>Avg Playtime</CardTitle>
                <CardDescription>All players</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{formatTime(getAveragePlaytime())}</p>
              </CardContent>
            </Card>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}
