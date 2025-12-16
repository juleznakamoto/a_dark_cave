
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseMonitor } from '@/lib/supabaseMonitor';
import { supabaseCache } from '@/lib/supabaseCache';

export function DevPanel() {
  const [stats, setStats] = useState<any[]>([]);
  const [serverStats, setServerStats] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const refreshStats = () => {
    setStats(supabaseMonitor.getStats());
  };

  const fetchServerStats = async () => {
    try {
      const response = await fetch('/api/monitor/stats');
      const data = await response.json();
      setServerStats(data);
    } catch (error) {
      console.error('Failed to fetch server stats:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      fetchServerStats();
    }
  }, [isOpen]);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button onClick={() => setIsOpen(!isOpen)} variant="outline" size="sm">
        {isOpen ? 'Close' : 'Dev Stats'}
      </Button>

      {isOpen && (
        <Card className="absolute bottom-12 right-0 w-96 max-h-96 overflow-auto">
          <CardHeader>
            <CardTitle className="text-sm">Supabase Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-xs">Client Calls</h3>
                <div className="space-x-2">
                  <Button size="sm" onClick={refreshStats}>Refresh</Button>
                  <Button size="sm" onClick={() => supabaseMonitor.reset()}>Reset</Button>
                </div>
              </div>
              <div className="text-xs space-y-1">
                {stats.slice(0, 10).map((stat, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate">{stat.endpoint}</span>
                    <span>{stat.count}x ({stat.avgTime.toFixed(0)}ms)</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-xs">Cache</h3>
                <Button size="sm" onClick={() => supabaseCache.clear()}>Clear</Button>
              </div>
              <div className="text-xs">
                Entries: {supabaseCache.size()}
              </div>
            </div>

            {serverStats && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-xs">Server Calls</h3>
                  <Button size="sm" onClick={fetchServerStats}>Refresh</Button>
                </div>
                <div className="text-xs space-y-1">
                  <div>Total: {serverStats.totalCalls}</div>
                  <div>Errors: {serverStats.totalErrors}</div>
                  {serverStats.stats.slice(0, 5).map((stat: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate">{stat.endpoint}</span>
                      <span>{stat.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
