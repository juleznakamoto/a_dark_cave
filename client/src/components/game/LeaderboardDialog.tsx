
import { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { getCurrentUser } from "@/game/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function LeaderboardDialog({ isOpen, onClose }: LeaderboardDialogProps) {
  const { username, setUsername } = useGameStore();
  const [normalLeaderboard, setNormalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cruelLeaderboard, setCruelLeaderboard] = useState<LeaderboardEntry[]>([]);
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
      const env = useDevStats ? 'dev' : 'prod';
      const [normalRes, cruelRes, metaRes] = await Promise.all([
        fetch(`/api/leaderboard/normal?env=${env}`),
        fetch(`/api/leaderboard/cruel?env=${env}`),
        fetch(`/api/leaderboard/metadata?env=${env}`),
      ]);

      if (normalRes.ok) {
        const data = await normalRes.json();
        setNormalLeaderboard(data);
      }

      if (cruelRes.ok) {
        const data = await cruelRes.json();
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

      const response = await fetch("/api/leaderboard/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username: tempUsername.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update username");

      setUsername(tempUsername.trim());
      setEditingUsername(false);
      
      toast({
        title: "Username saved",
        description: "Your username has been updated",
      });

      // Refresh leaderboards
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

  const formatTime = (ms: number) => {
    const hours = ms / 1000 / 60 / 60;
    return `${hours.toFixed(2)}h`;
  };

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }

    if (entries.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No entries yet</div>;
    }

    return (
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg w-8 text-center">
                {index + 1}
              </span>
              <span className="font-sm">{entry.displayName}</span>
            </div>
            <span className="text-muted-foreground">{formatTime(entry.play_time)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Leaderboard</span>
            {isDev && (
              <div className="flex items-center gap-2">
                <Label htmlFor="env-switch" className="text-sm font-normal">
                  {useDevStats ? 'Dev' : 'Prod'}
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Username:</span>
                  <span className="font-medium">{username || "Not set"}</span>
                  <Button
                    onClick={() => setEditingUsername(true)}
                    variant="ghost"
                    size="sm"
                  >
                    🖉
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="normal" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="normal">Normal Mode</TabsTrigger>
            <TabsTrigger value="cruel">Cruel Mode</TabsTrigger>
          </TabsList>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground text-center mt-2">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
          <TabsContent value="normal" className="flex-1 min-h-0">
            <ScrollArea className="h-[400px] pr-4">
              {renderLeaderboard(normalLeaderboard)}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="cruel" className="flex-1 min-h-0">
            <ScrollArea className="h-[400px] pr-4">
              {renderLeaderboard(cruelLeaderboard)}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
