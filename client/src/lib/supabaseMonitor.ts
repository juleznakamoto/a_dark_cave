
import { logger } from './logger';

interface CallStats {
  endpoint: string;
  count: number;
  totalTime: number;
  avgTime: number;
  lastCalled: number;
  cacheable: boolean;
  cacheHits?: number;
  cacheMisses?: number;
}

class SupabaseMonitor {
  private calls: Map<string, CallStats> = new Map();
  private sessionStart: number = Date.now();

  logCall(endpoint: string, duration: number, cacheable: boolean = false, cacheHit: boolean = false) {
    const existing = this.calls.get(endpoint);
    
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
      existing.lastCalled = Date.now();
      
      if (cacheable) {
        if (cacheHit) {
          existing.cacheHits = (existing.cacheHits || 0) + 1;
        } else {
          existing.cacheMisses = (existing.cacheMisses || 0) + 1;
        }
      }
    } else {
      this.calls.set(endpoint, {
        endpoint,
        count: 1,
        totalTime: duration,
        avgTime: duration,
        lastCalled: Date.now(),
        cacheable,
        cacheHits: cacheable && cacheHit ? 1 : 0,
        cacheMisses: cacheable && !cacheHit ? 1 : 0,
      });
    }
  }

  getStats(): CallStats[] {
    return Array.from(this.calls.values()).sort((a, b) => b.count - a.count);
  }

  printReport() {
    const stats = this.getStats();
    const sessionDuration = (Date.now() - this.sessionStart) / 1000;
    
    logger.log('\n=== SUPABASE API CALL REPORT ===');
    logger.log(`Session Duration: ${sessionDuration.toFixed(2)}s\n`);
    
    logger.log('Top API Calls by Frequency:');
    stats.slice(0, 10).forEach((stat, i) => {
      const cacheInfo = stat.cacheable 
        ? ` | Cache: ${stat.cacheHits}/${(stat.cacheHits || 0) + (stat.cacheMisses || 0)} hits`
        : '';
      logger.log(
        `${i + 1}. ${stat.endpoint}: ${stat.count} calls, avg ${stat.avgTime.toFixed(2)}ms${cacheInfo}`
      );
    });
    
    logger.log('\nOptimization Opportunities:');
    stats.forEach(stat => {
      // Flag high-frequency calls
      if (stat.count > 10) {
        logger.warn(`⚠️ HIGH FREQUENCY: ${stat.endpoint} called ${stat.count} times`);
      }
      
      // Flag slow calls
      if (stat.avgTime > 500) {
        logger.warn(`⚠️ SLOW: ${stat.endpoint} avg ${stat.avgTime.toFixed(2)}ms`);
      }
      
      // Flag cacheable calls with low hit rates
      if (stat.cacheable && stat.cacheMisses && stat.cacheHits) {
        const hitRate = stat.cacheHits / (stat.cacheHits + stat.cacheMisses);
        if (hitRate < 0.5) {
          logger.warn(`⚠️ LOW CACHE HIT RATE: ${stat.endpoint} - ${(hitRate * 100).toFixed(1)}%`);
        }
      }
    });
    
    logger.log('\n================================\n');
  }

  reset() {
    this.calls.clear();
    this.sessionStart = Date.now();
  }
}

export const supabaseMonitor = new SupabaseMonitor();

// Auto-print report every 5 minutes in dev
if (import.meta.env.DEV) {
  setInterval(() => {
    supabaseMonitor.printReport();
  }, 5 * 60 * 1000);
}

// Print report on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    supabaseMonitor.printReport();
  });
}
