
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LookupTabProps {
  lookupType: "id" | "email";
  setLookupType: (value: "id" | "email") => void;
  lookupUserId: string;
  setLookupUserId: (value: string) => void;
  lookupLoading: boolean;
  lookupError: string;
  lookupResult: any | null;
  handleLookupUser: () => void;
  getLookupUserClicks: () => any[];
  getLookupUserPurchases: () => any[];
  formatTime: (minutes: number) => string;
  setLookupResult: (value: any | null) => void;
  setLookupError: (value: string) => void;
}

export default function LookupTab(props: LookupTabProps) {
  const {
    lookupType,
    setLookupType,
    lookupUserId,
    setLookupUserId,
    lookupLoading,
    lookupError,
    lookupResult,
    handleLookupUser,
    getLookupUserClicks,
    getLookupUserPurchases,
    formatTime,
    setLookupResult,
    setLookupError,
  } = props;

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
                setLookupResult(null);
                setLookupError("");
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

          {lookupResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User ID</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm break-all">
                      {lookupResult.user_id}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Last Updated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {new Date(lookupResult.updated_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Playtime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {lookupResult.game_state?.playTime
                        ? formatTime(
                            Math.round(
                              lookupResult.game_state.playTime / 1000 / 60,
                            ),
                          )
                        : "0m"}
                    </p>
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
                            {purchase.price_paid === 0
                              ? "Free"
                              : `€${(purchase.price_paid / 100).toFixed(2)}`}
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
                    {JSON.stringify(lookupResult.game_state, null, 2)}
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
