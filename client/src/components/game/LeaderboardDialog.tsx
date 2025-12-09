
import { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { getCurrentUser } from "@/game/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboards();
    }
  }, [isOpen]);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const [normalRes, cruelRes] = await Promise.all([
        fetch("/api/leaderboard/normal"),
        fetch("/api/leaderboard/cruel"),
      ]);

      if (normalRes.ok) {
        const data = await normalRes.json();
        setNormalLeaderboard(data);
      }

      if (cruelRes.ok) {
        const data = await cruelRes.json();
        setCruelLeaderboard(data);
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
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
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
          <DialogTitle>Leaderboard</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-muted rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingUsername ? (
                <div className="flex gap-2">
                  <Input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="Enter username"
                    maxLength={20}
                    className="max-w-xs"
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
                    Edit
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
