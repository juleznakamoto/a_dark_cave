import { useState } from "react";
import { formatAdminUnifiedRevenueEur } from "@shared/purchaseRevenueEur";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface LookupAccount {
  user_id: string;
  email: string | null;
  devMultipliers: boolean;
  devMultipliersLockedByEnv: boolean;
  steamMode?: boolean;
}

interface LookupTabProps {
  environment: "dev" | "prod";
  lookupType: "id" | "email";
  setLookupType: (value: "id" | "email") => void;
  lookupUserId: string;
  setLookupUserId: (value: string) => void;
  lookupLoading: boolean;
  lookupError: string;
  lookupResult: any | null;
  lookupAccount: LookupAccount | null;
  setLookupAccount: (value: LookupAccount | null) => void;
  setLookupResult: (value: any | null) => void;
  setLookupError: (value: string) => void;
  handleLookupUser: () => void;
  getLookupUserClicks: () => any[];
  getLookupUserPurchases: () => any[];
  formatTime: (minutes: number) => string;
}

export default function LookupTab(props: LookupTabProps) {
  const {
    environment,
    lookupType,
    setLookupType,
    lookupUserId,
    setLookupUserId,
    lookupLoading,
    lookupError,
    lookupResult,
    lookupAccount,
    setLookupAccount,
    setLookupResult,
    setLookupError,
    handleLookupUser,
    getLookupUserClicks,
    getLookupUserPurchases,
    formatTime,
  } = props;
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const handleToggleDevMultipliers = async (enabled: boolean) => {
    if (!lookupAccount || lookupAccount.devMultipliersLockedByEnv) return;
    setToggleBusy(true);
    setToggleError("");
    try {
      const supabase = await getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active admin session.");
      }
      const response = await fetch("/api/admin/dev-multipliers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          env: environment,
          userId: lookupAccount.user_id,
          enabled,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update DEV multipliers");
      }
      if (data.account) {
        setLookupAccount(data.account);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update DEV multipliers";
      logger.error("DEV multipliers toggle failed:", error);
      setToggleError(message);
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Save Game Lookup</CardTitle>
          <CardDescription>
            Enter a user ID or email to view their save game data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select
              value={lookupType}
              onValueChange={(value: "id" | "email") => {
                setLookupType(value);
                setLookupUserId("");
                setLookupAccount(null);
                setLookupResult(null);
                setLookupError("");
                setToggleError("");
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">User ID</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="text"
              placeholder={lookupType === "id" ? "Enter user ID (UUID)" : "Enter email address"}
              value={lookupUserId}
              onChange={(e) => setLookupUserId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <button
              onClick={handleLookupUser}
              disabled={!lookupUserId.trim() || lookupLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            >
              {lookupLoading ? "Loading..." : "Lookup"}
            </button>
          </div>

          {lookupError && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              {lookupError}
            </div>
          )}

          {(lookupAccount || lookupResult) && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dev multipliers</CardTitle>
                  <CardDescription>
                    Same resource, production, cooldown, and build-time
                    multipliers as local DEV. Takes effect the next time this
                    account loads the game on a-dark-cave.com.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="dev-multipliers-toggle" className="text-sm">
                      Enable DEV multipliers
                    </Label>
                    <Switch
                      id="dev-multipliers-toggle"
                      checked={lookupAccount?.devMultipliers === true}
                      disabled={
                        !lookupAccount ||
                        toggleBusy ||
                        lookupAccount.devMultipliersLockedByEnv
                      }
                      onCheckedChange={handleToggleDevMultipliers}
                    />
                  </div>
                  {lookupAccount?.email ? (
                    <p className="text-xs text-muted-foreground">
                      {lookupAccount.email}
                    </p>
                  ) : null}
                  {lookupAccount?.devMultipliersLockedByEnv ? (
                    <p className="text-xs text-muted-foreground">
                      Locked on by DEV_MULTIPLIER_EMAILS. Remove the email from
                      that env var to turn this off.
                    </p>
                  ) : null}
                  {lookupAccount?.steamMode ? (
                    <p className="text-xs text-muted-foreground">
                      This account also uses Steam Game UI on the live site.
                    </p>
                  ) : null}
                  {toggleError ? (
                    <p className="text-sm text-destructive">{toggleError}</p>
                  ) : null}
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User ID</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm break-all">
                      {lookupAccount?.user_id ?? lookupResult?.user_id}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Last Updated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {lookupResult?.updated_at
                        ? new Date(lookupResult.updated_at).toLocaleString()
                        : "No save"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Playtime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {lookupResult?.game_state?.playTime
                        ? formatTime(
                          Math.round(
                            lookupResult.game_state.playTime / 1000 / 60,
                          ),
                        )
                        : "0m"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Last feedback form</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {lookupResult?.game_state?.lastFeedbackOpenedAt
                        ? new Date(
                          lookupResult.game_state.lastFeedbackOpenedAt,
                        ).toLocaleString()
                        : "Never"}
                    </p>
                    {lookupResult?.game_state?.lastFeedbackOpenedSource ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Source: {lookupResult.game_state.lastFeedbackOpenedSource}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Button Clicks</CardTitle>
                  <CardDescription>
                    All button click records for this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {getLookupUserClicks().length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {getLookupUserClicks().map((click, index) => (
                        <div
                          key={index}
                          className="p-3 bg-muted rounded-md"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium">
                              {new Date(click.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(click.clicks, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No button clicks recorded
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Purchases</CardTitle>
                  <CardDescription>
                    All purchases made by this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {getLookupUserPurchases().length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {getLookupUserPurchases().map((purchase, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center border-b pb-2"
                        >
                          <div>
                            <p className="font-medium">
                              {purchase.item_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(purchase.purchased_at).toLocaleString()}
                              {purchase.cruel_mode === true && (
                                <span className="ml-2 text-red-600">Cruel</span>
                              )}
                              {purchase.cruel_mode === false && (
                                <span className="ml-2 text-muted-foreground">Normal</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Item ID: {purchase.item_id}
                            </p>
                            {purchase.bundle_id && (
                              <p className="text-xs text-muted-foreground">
                                Bundle: {purchase.bundle_id}
                              </p>
                            )}
                          </div>
                          <p className="font-bold">
                            {formatAdminUnifiedRevenueEur(purchase)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No purchases recorded
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Game State (JSON)</CardTitle>
                  <CardDescription>
                    Complete save game data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 bg-muted rounded-md overflow-auto max-h-[600px] text-xs">
                    {lookupResult?.game_state
                      ? JSON.stringify(lookupResult.game_state, null, 2)
                      : "No save game"}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
