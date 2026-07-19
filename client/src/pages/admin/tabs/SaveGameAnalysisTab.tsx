import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { logger } from "@/lib/logger";
import type {
  SaveGameAnalysisRow,
  SaveGameAnalysisSummary,
  SaveGameIssueKind,
} from "@shared/saveGameAnalysis";

const VERSION_BUCKET_COLORS = {
  current: "#22c55e",
  last: "#f59e0b",
  older: "#94a3b8",
} as const;

/** Mode of non-current stamped SHAs in the sample (= "last version" bucket). */
function resolveLastVersionSha(
  rows: SaveGameAnalysisRow[],
): string | null {
  const counts = new Map<string, { count: number; newestUpdated: string }>();
  for (const row of rows) {
    if (row.isCurrentVersion || !row.clientBuildSha) continue;
    const prev = counts.get(row.clientBuildSha);
    if (!prev) {
      counts.set(row.clientBuildSha, {
        count: 1,
        newestUpdated: row.updated_at,
      });
      continue;
    }
    prev.count += 1;
    if (row.updated_at > prev.newestUpdated) {
      prev.newestUpdated = row.updated_at;
    }
  }
  let bestSha: string | null = null;
  let bestCount = 0;
  let bestNewest = "";
  for (const [sha, { count, newestUpdated }] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && newestUpdated > bestNewest)
    ) {
      bestSha = sha;
      bestCount = count;
      bestNewest = newestUpdated;
    }
  }
  return bestSha;
}

const ISSUE_LABELS: Record<SaveGameIssueKind, string> = {
  invalid_game_state: "Invalid or empty game_state",
  negative_resource: "Negative resource",
  non_numeric_resource: "Non-numeric resource",
  negative_villager: "Negative villager count",
  bad_playtime: "Bad playTime (null / NaN / missing)",
  negative_playtime: "Negative playTime",
  wiped_tools: "Wiped tools (craft flags but zero owned)",
  missing_tools_with_craft_flags: "Missing tools key + craft flags",
  missing_unlock_flags: "Missing tab unlock flags (village/forest/bastion)",
  bad_story_seen: "Malformed story.seen",
  bad_game_stats: "Malformed game_stats",
  updated_before_created: "updated_at before created_at",
  population_mismatch: "Villagers exceed housing cap",
};

/** `user_id` can be null after account anonymization (migration 009). */
function formatSaveUserLabel(row: {
  username?: string | null;
  user_id?: string | null;
  id?: string;
}): string {
  if (row.username) return row.username;
  if (row.user_id) return `${row.user_id.slice(0, 8)}…`;
  if (row.id) return `anon:${row.id.slice(0, 8)}…`;
  return "anonymous";
}

interface SaveGameAnalysisTabProps {
  environment: "dev" | "prod";
}

export default function SaveGameAnalysisTab({
  environment,
}: SaveGameAnalysisTabProps) {
  const [analysis, setAnalysis] = useState<SaveGameAnalysisSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClean, setShowClean] = useState(false);

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/save-analysis?env=${environment}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to load save analysis (${response.status})`);
      }
      const data = (await response.json()) as { analysis: SaveGameAnalysisSummary };
      setAnalysis(data.analysis);
    } catch (err) {
      logger.error("Save game analysis fetch failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  const issueRows = useMemo(() => {
    if (!analysis) return [];
    return analysis.rows.filter((row) => row.issues.length > 0);
  }, [analysis]);

  const outdatedRows = useMemo(() => {
    if (!analysis) return [];
    return analysis.rows.filter((row) => !row.isCurrentVersion);
  }, [analysis]);

  const versionDistribution = useMemo(() => {
    if (!analysis) {
      return {
        lastBuildSha: null as string | null,
        chartData: [] as {
          name: string;
          count: number;
          fill: string;
        }[],
      };
    }
    const lastBuildSha = resolveLastVersionSha(analysis.rows);
    let current = 0;
    let last = 0;
    let older = 0;
    for (const row of analysis.rows) {
      if (row.isCurrentVersion) {
        current += 1;
      } else if (lastBuildSha && row.clientBuildSha === lastBuildSha) {
        last += 1;
      } else {
        older += 1;
      }
    }
    return {
      lastBuildSha,
      chartData: [
        {
          name: "Current version",
          count: current,
          fill: VERSION_BUCKET_COLORS.current,
        },
        {
          name: "Last version",
          count: last,
          fill: VERSION_BUCKET_COLORS.last,
        },
        {
          name: "Older version",
          count: older,
          fill: VERSION_BUCKET_COLORS.older,
        },
      ],
    };
  }, [analysis]);

  const cleanCount = analysis
    ? analysis.scanned - analysis.rowsWithIssues
    : 0;

  const shortSha = (sha: string | null | undefined) => {
    if (!sha) return "—";
    return sha.length > 12 ? `${sha.slice(0, 12)}…` : sha;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Analyzing last 100 saves…
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save Game Analysis</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={() => void loadAnalysis()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Save Game Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Last {analysis.scanned} saves by{" "}
            <code className="text-xs">updated_at</code>
            {analysis.oldestUpdated && analysis.newestUpdated ? (
              <>
                {" "}
                ({analysis.oldestUpdated.slice(0, 19)} →{" "}
                {analysis.newestUpdated.slice(0, 19)} UTC)
              </>
            ) : null}
            {analysis.currentBuildSha ? (
              <>
                {" · "}
                published build{" "}
                <code className="text-xs">
                  {shortSha(analysis.currentBuildSha)}
                </code>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAnalysis()}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scanned</CardDescription>
            <CardTitle className="text-2xl">{analysis.scanned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Not on published build</CardDescription>
            <CardTitle
              className={`text-2xl ${analysis.notOnCurrentVersion > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
            >
              {analysis.notOnCurrentVersion}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With issues</CardDescription>
            <CardTitle
              className={`text-2xl ${analysis.rowsWithIssues > 0 ? "text-destructive" : ""}`}
            >
              {analysis.rowsWithIssues}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clean</CardDescription>
            <CardTitle className="text-2xl">{cleanCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client version distribution</CardTitle>
          <CardDescription>
            Last {analysis.scanned} saves: published build vs the most common
            other stamped SHA (last version) vs everything else (older SHAs or
            missing stamp)
            {versionDistribution.lastBuildSha ? (
              <>
                {" · "}last{" "}
                <code className="text-xs">
                  {shortSha(versionDistribution.lastBuildSha)}
                </code>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[220px] w-full">
            <BarChart
              layout="vertical"
              data={versionDistribution.chartData}
              margin={{ top: 8, right: 36, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                {versionDistribution.chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  className="fill-foreground text-xs"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {analysis.v2Compare ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Save V2 sidecar (dual-write)</CardTitle>
            <CardDescription>
              Compares{" "}
              <code className="text-xs">game_state_v2</code> vs legacy{" "}
              <code className="text-xs">game_state</code> (playTime floored).{" "}
              Mismatch = same playTime, different gameplay values. V2 stale =
              legacy ahead of sidecar (expected while dual-write is best-effort).
              Shape drift = key only on one side. Expected noise = UI/timers.
              Table lists same-moment mismatches / invalid only. Load still uses
              legacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 text-sm">
              <div>
                <div className="text-muted-foreground">With V2</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.withV2}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Missing V2</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.missingV2}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Match</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.match}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Expected noise</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.expectedNoise}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Shape drift</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.shapeDrift}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">V2 stale</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.v2Stale ?? 0}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Mismatch</div>
                <div
                  className={`font-mono text-lg tabular-nums ${analysis.v2Compare.mismatch > 0
                    ? "text-destructive"
                    : ""
                    }`}
                >
                  {analysis.v2Compare.mismatch}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Invalid V2</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.invalidV2}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Invalid legacy</div>
                <div className="font-mono text-lg tabular-nums">
                  {analysis.v2Compare.invalidLegacy}
                </div>
              </div>
            </div>
            {analysis.v2Compare.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">User</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Rev</th>
                      <th className="py-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.v2Compare.rows.slice(0, 40).map((row, idx) => (
                      <tr
                        key={row.user_id ?? `v2-${idx}`}
                        className="border-b border-border/60"
                      >
                        <td className="py-2 pr-3 font-mono text-xs">
                          {formatSaveUserLabel(row)}
                        </td>
                        <td className="py-2 pr-3">{row.status}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums">
                          {row.save_revision ?? "—"}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {row.mismatchCount != null && row.mismatchCount > 0
                            ? `(${row.mismatchCount}) `
                            : ""}
                          {row.details.join(", ") || "—"}
                          {row.shapeDriftCount != null &&
                            row.shapeDriftCount > 0
                            ? ` · +${row.shapeDriftCount} shape`
                            : ""}
                          {row.expectedNoiseCount != null &&
                            row.expectedNoiseCount > 0
                            ? ` · +${row.expectedNoiseCount} noise`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outdated / unknown clients</CardTitle>
          <CardDescription>
            {analysis.notOnCurrentVersion} of {analysis.scanned} recent saves
            are not on the published build
            {analysis.currentBuildSha
              ? ` (${shortSha(analysis.currentBuildSha)})`
              : " (published SHA unknown)"}
            . For prod this is{" "}
            <code className="text-xs">a-dark-cave.com/api/version</code>, not
            this admin host. Missing SHA usually means the player has not saved
            since version tracking was added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outdatedRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All scanned saves are on the published build.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Updated</th>
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 pr-3 font-medium">Play</th>
                    <th className="py-2 pr-3 font-medium">Client SHA</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outdatedRows.map((row) => (
                    <tr
                      key={row.id ?? row.user_id}
                      className="border-b align-top"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">
                        {row.updated_at.slice(0, 19)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs max-w-[140px] truncate">
                        {formatSaveUserLabel(row)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.playmin != null ? `${row.playmin}m` : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {shortSha(row.clientBuildSha)}
                      </td>
                      <td className="py-2 text-xs">
                        {row.clientBuildSha ? "Outdated build" : "No version stamped"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {Object.keys(analysis.byKind).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue counts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {(Object.entries(analysis.byKind) as [SaveGameIssueKind, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([kind, count]) => (
                  <li key={kind} className="flex justify-between gap-4">
                    <span>{ISSUE_LABELS[kind] ?? kind}</span>
                    <span className="font-mono tabular-nums">{count}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No issues detected in the last {analysis.scanned} saves.
          </CardContent>
        </Card>
      )}

      {issueRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Affected saves</CardTitle>
            <CardDescription>
              {issueRows.length} save{issueRows.length === 1 ? "" : "s"} with
              one or more flags
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Updated</th>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Play</th>
                  <th className="py-2 pr-3 font-medium">Build</th>
                  <th className="py-2 pr-3 font-medium">Tools</th>
                  <th className="py-2 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody>
                {issueRows.map((row) => (
                  <tr key={row.id ?? row.user_id} className="border-b align-top">
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">
                      {row.updated_at.slice(0, 19)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs max-w-[140px] truncate">
                      {formatSaveUserLabel(row)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.playmin != null ? `${row.playmin}m` : "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {shortSha(row.clientBuildSha)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.has_tools_key ? row.tools_owned : "missing"}
                    </td>
                    <td className="py-2">
                      <ul className="space-y-0.5">
                        {row.issues.map((issue, idx) => (
                          <li key={`${issue.kind}-${idx}`} className="text-xs">
                            <span className="font-medium">
                              {ISSUE_LABELS[issue.kind] ?? issue.kind}
                            </span>
                            {issue.field ? (
                              <span className="text-muted-foreground">
                                {" "}
                                ({issue.field}
                                {issue.detail ? `: ${issue.detail}` : ""})
                              </span>
                            ) : issue.detail ? (
                              <span className="text-muted-foreground">
                                {" "}
                                ({issue.detail})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showClean}
          onChange={(e) => setShowClean(e.target.checked)}
        />
        Show clean saves ({cleanCount})
      </label>

      {showClean && cleanCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clean saves</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Updated</th>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Play</th>
                  <th className="py-2 pr-3 font-medium">Build</th>
                  <th className="py-2 font-medium">Tools</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rows
                  .filter((row) => row.issues.length === 0)
                  .map((row) => (
                    <tr key={row.id ?? row.user_id} className="border-b">
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.updated_at.slice(0, 19)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {formatSaveUserLabel(row)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.playmin != null ? `${row.playmin}m` : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {shortSha(row.clientBuildSha)}
                      </td>
                      <td className="py-2 tabular-nums">{row.tools_owned}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
