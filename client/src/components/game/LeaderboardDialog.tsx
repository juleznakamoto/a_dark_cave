
import { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { getCurrentUser } from "@/game/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

const isDev = import.meta.env.DEV;

interface LeaderboardEntry {
  id: string;
  displayName: string;
  play_time: number;
  completed_at: string;
}

interface LeaderboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LeaderboardTabProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  lastUpdated: string | null;
}

function LeaderboardTab({ entries, loading, lastUpdated }: LeaderboardTabProps) {
  const formatTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const getCrown = (index: number) => {
    if (index === 0)
      return { symbol: "✠", color: "text-yellow-500/50 rotate-45" };
    if (index === 1)
      return { symbol: "✠", color: "text-gray-400/50 rotate-45" };
    if (index === 2)
      return { symbol: "✠", color: "text-amber-600/50 rotate-45" };
    return null;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-3 pb-2 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm w-8 text-center">#</span>
          <span className="font-semibold text-sm">Player</span>
        </div>
        <span className="font-semibold text-sm">Completion Time</span>
      </div>
      <div
        className="h-[400px] pr-4 flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="space-y-2 pt-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries yet
            </div>
          ) : (
            entries.map((entry, index) => {
              const crown = getCrown(index);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold text-lg w-8 text-center ${crown?.color || ""}`}
                    >
                      {crown ? crown.symbol : index + 1}
                    </span>
                    <span className="font-sm">{entry.displayName}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatTime(entry.play_time)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      {lastUpdated && (
        <div className="text-xs text-muted-foreground text-center pt-2 opacity-50">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardDialog({
  isOpen,
  onClose,
}: LeaderboardDialogProps) {
  const { username, setUsername } = useGameStore();
  const [normalLeaderboard, setNormalLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [cruelLeaderboard, setCruelLeaderboard] = useState<LeaderboardEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username || "");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [useDevStats, setUseDevStats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboards();
    }
  }, [isOpen, useDevStats]);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const env = useDevStats ? "dev" : "prod";
      logger.log(`Fetching ${env} leaderboard data...`);

      const [normalRes, cruelRes, metaRes] = await Promise.all([
        fetch(`/api/leaderboard/normal?env=${env}`),
        fetch(`/api/leaderboard/cruel?env=${env}`),
        fetch(`/api/leaderboard/metadata?env=${env}`),
      ]);

      if (normalRes.ok) {
        const data = await normalRes.json();
        logger.log(`${env} Normal leaderboard:`, data);
        setNormalLeaderboard(data);
      }

      if (cruelRes.ok) {
        const data = await cruelRes.json();
        logger.log(`${env} Cruel leaderboard:`, data);
        setCruelLeaderboard(data);
      }

      if (metaRes.ok) {
        const data = await metaRes.json();
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      logger.error("Failed to fetch leaderboard:", error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!tempUsername.trim()) {
      toast({
        title: "Invalid username",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (tempUsername.length > 20) {
      toast({
        title: "Invalid username",
        description: "Username must be 20 characters or less",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to set a username",
          variant: "destructive",
        });
        return;
      }

      const env = useDevStats ? "dev" : "prod";
      const response = await fetch(
        `/api/leaderboard/update-username?env=${env}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            username: tempUsername.trim(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "Username contains inappropriate language") {
          toast({
            title: "Username not allowed",
            description:
              "This username contains inappropriate language. Please choose a different one.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 409) {
          toast({
            title: "Username taken",
            description:
              "This username is already in use. Please choose another.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to update username");
      }

      setUsername(tempUsername.trim());
      setEditingUsername(false);

      toast({
        title: "Username saved",
        description: "Your username has been updated",
      });

      fetchLeaderboards();
    } catch (error) {
      logger.error("Failed to save username:", error);
      toast({
        title: "Error",
        description: "Failed to save username",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Leaderboard</span>
            {isDev && (
              <div className="flex items-center gap-2">
                <Label htmlFor="env-switch" className="text-sm font-normal">
                  {useDevStats ? "Dev" : "Prod"}
                </Label>
                <Switch
                  id="env-switch"
                  checked={useDevStats}
                  onCheckedChange={setUseDevStats}
                />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-0 p-2 bg-muted rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingUsername ? (
                <div className="flex gap-2">
                  <Input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="Enter name"
                    maxLength={12}
                    className="h-9 w-32"
                  />
                  <Button onClick={handleSaveUsername} size="sm">
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingUsername(false);
                      setTempUsername(username || "");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Username:
                    </span>
                    <span className="font-medium">{username || "Not set"}</span>
                    <Button
                      onClick={() => setEditingUsername(true)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="grey"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Current Playtime:
                    </span>
                    <span className="font-medium">{formatTime(useGameStore.getState().playTime)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="normal" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-1">
            <TabsTrigger value="normal">Normal Mode</TabsTrigger>
            <TabsTrigger value="cruel">Cruel Mode</TabsTrigger>
          </TabsList>
          <TabsContent value="normal" className="flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
            <LeaderboardTab 
              entries={normalLeaderboard} 
              loading={loading} 
              lastUpdated={lastUpdated} 
            />
          </TabsContent>
          <TabsContent value="cruel" className="flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
            <LeaderboardTab 
              entries={cruelLeaderboard} 
              loading={loading} 
              lastUpdated={lastUpdated} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
