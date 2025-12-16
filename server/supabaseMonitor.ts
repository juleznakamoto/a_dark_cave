
interface ServerCallStats {
  endpoint: string;
  count: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
  lastCalled: number;
  errors: number;
}

class ServerSupabaseMonitor {
  private calls: Map<string, ServerCallStats> = new Map();

  logCall(endpoint: string, duration: number, error: boolean = false) {
    const existing = this.calls.get(endpoint);

    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.minTime = Math.min(existing.minTime, duration);
      existing.lastCalled = Date.now();
      if (error) existing.errors++;
    } else {
      this.calls.set(endpoint, {
        endpoint,
        count: 1,
        totalTime: duration,
        avgTime: duration,
        maxTime: duration,
        minTime: duration,
        lastCalled: Date.now(),
        errors: error ? 1 : 0,
      });
    }
  }

  getStats(): ServerCallStats[] {
    return Array.from(this.calls.values()).sort((a, b) => b.count - a.count);
  }

  printReport() {
    const stats = this.getStats();
    
    console.log('\n=== SERVER SUPABASE API REPORT ===');
    console.log('Top API Calls:');
    stats.slice(0, 15).forEach((stat, i) => {
      console.log(
        `${i + 1}. ${stat.endpoint}: ${stat.count} calls, ` +
        `avg ${stat.avgTime.toFixed(2)}ms (${stat.minTime.toFixed(0)}-${stat.maxTime.toFixed(0)}ms), ` +
        `${stat.errors} errors`
      );
    });
    console.log('===================================\n');
  }

  reset() {
    this.calls.clear();
  }
}

export const serverSupabaseMonitor = new ServerSupabaseMonitor();

// Print report every 10 minutes
setInterval(() => {
  serverSupabaseMonitor.printReport();
}, 10 * 60 * 1000);
