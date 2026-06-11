import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

type LogLevel = "error" | "warn" | "info";

interface LogEntry {
  time: string;
  source: string;
  message: string;
  level: LogLevel;
}

type LevelFilter = "all" | LogLevel;

const LEVEL_STYLES: Record<LogLevel, string> = {
  error: "bg-red-500/15 text-red-400 border border-red-500/30",
  warn: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  info: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
};

export default function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("No active admin session.");
        setLogs([]);
        return;
      }

      const params = new URLSearchParams({ limit: "300" });
      if (levelFilter !== "all") {
        params.set("level", levelFilter);
      }

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Failed to load logs (${res.status}).`);
        logger.error("Logs fetch failed:", res.status, text);
        setLogs([]);
        return;
      }
      const data = (await res.json()) as { logs?: LogEntry[] };
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e) {
      setError("Failed to load logs.");
      logger.error("Logs fetch error:", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Server Logs</CardTitle>
              <CardDescription>
                Most recent server log lines from the running instance
                (in-memory; cleared on restart/redeploy).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={levelFilter}
                onValueChange={(v: LevelFilter) => setLevelFilter(v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="warn">Warnings</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => void loadLogs()}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{logs.length} shown</span>
            <span className="text-red-400">{errorCount} errors</span>
            <span className="text-amber-400">{warnCount} warnings</span>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {loading && logs.length === 0 ? (
            <p className="text-muted-foreground">Loading logs…</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">No log entries.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Level</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry, i) => {
                    let timeLabel = entry.time;
                    try {
                      timeLabel = format(parseISO(entry.time), "MMM dd HH:mm:ss");
                    } catch {
                      /* keep raw value */
                    }
                    return (
                      <tr
                        key={`${entry.time}-${i}`}
                        className="border-t align-top"
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                          {timeLabel}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${LEVEL_STYLES[entry.level]}`}
                          >
                            {entry.level}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                          {entry.source}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs break-all">
                          {entry.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
