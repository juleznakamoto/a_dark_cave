import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";
import type {
  SaveGameAnalysisSummary,
  SaveGameIssueKind,
} from "@shared/saveGameAnalysis";

const ISSUE_LABELS: Record<SaveGameIssueKind, string> = {
  invalid_game_state: "Invalid or empty game_state",
  negative_resource: "Negative resource",
  non_numeric_resource: "Non-numeric resource",
  negative_villager: "Negative villager count",
  bad_playtime: "Bad playTime (null / NaN / missing)",
  negative_playtime: "Negative playTime",
  wiped_tools: "Wiped tools (craft flags but zero owned)",
  missing_tools_with_craft_flags: "Missing tools key + craft flags",
  wiped_buildings: "Wiped buildings (build/village flags but zero total)",
  missing_buildings_with_build_flags: "Missing buildings key + build flags",
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

  const cleanCount = analysis
    ? analysis.scanned - analysis.rowsWithIssues
    : 0;

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scanned</CardDescription>
            <CardTitle className="text-2xl">{analysis.scanned}</CardTitle>
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

      {analysis.v2Compare ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Save V2 sidecar (dual-write)</CardTitle>
            <CardDescription>
              Compares{" "}
              <code className="text-xs">game_state_v2</code> vs legacy{" "}
              <code className="text-xs">game_state</code> (playTime floored).{" "}
              Mismatch = same key, different values. Shape drift = key only on one
              side (V1 diff vs V2 full blob). Expected noise = UI/cooldowns. Table
              lists value mismatches / invalid only. Load still uses legacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 text-sm">
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
                <div className="text-muted-foreground">Mismatch</div>
                <div className="font-mono text-lg tabular-nums">
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
                  <th className="py-2 pr-3 font-medium">Tools</th>
                  <th className="py-2 pr-3 font-medium">Bldgs</th>
                  <th className="py-2 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody>
                {issueRows.map((row, idx) => (
                  <tr
                    key={row.id ?? row.user_id ?? `issue-${idx}`}
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
                    <td className="py-2 pr-3 tabular-nums">
                      {row.has_tools_key ? row.tools_owned : "missing"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.has_buildings_key ? row.buildings_total : "missing"}
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
                  <th className="py-2 pr-3 font-medium">Tools</th>
                  <th className="py-2 font-medium">Bldgs</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rows
                  .filter((row) => row.issues.length === 0)
                  .map((row, idx) => (
                    <tr
                      key={row.id ?? row.user_id ?? `clean-${idx}`}
                      className="border-b"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.updated_at.slice(0, 19)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {formatSaveUserLabel(row)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.playmin != null ? `${row.playmin}m` : "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{row.tools_owned}</td>
                      <td className="py-2 tabular-nums">{row.buildings_total}</td>
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
