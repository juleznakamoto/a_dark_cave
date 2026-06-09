
import { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { getCurrentUser } from "@/game/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

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
  tabId: string;
}

const formatTime = (ms: number) => {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

function LeaderboardTab({ entries, loading, lastUpdated, tabId }: LeaderboardTabProps) {
  const { t } = useTranslation(["ui", "common"]);

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
          <span className="font-semibold text-sm w-8 text-center">{t("ui:leaderboard.rank")}</span>
          <span className="font-semibold text-sm">{t("ui:leaderboard.player")}</span>
        </div>
        <span className="font-semibold text-sm">{t("ui:leaderboard.completionTime")}</span>
      </div>
      <ScrollAreaWithIndicator
        className="h-[calc(80vh-240px)]"
        scrollAreaId={`leaderboard-${tabId}`}
      >
        <div className="space-y-2 pt-2 pr-4 pb-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t("common:status.loading")}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("ui:leaderboard.noEntries")}
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
      </ScrollAreaWithIndicator>
      <div className="text-xs text-muted-foreground text-center pt-2 opacity-50 space-y-0.5">
        {lastUpdated && (
          <div>
            {t("ui:leaderboard.lastUpdated", {
              time: new Date(lastUpdated).toLocaleString(),
            })}
          </div>
        )}
        <div>{t("ui:leaderboard.recentCompletionsNote")}</div>
      </div>
    </div>
  );
}

export default function LeaderboardDialog({
  isOpen,
  onClose,
}: LeaderboardDialogProps) {
  const { t } = useTranslation(["ui", "common"]);
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

      const fetchOpts: RequestInit = { cache: "no-store" };
      const [normalRes, cruelRes, metaRes] = await Promise.all([
        fetch(`/api/leaderboard/normal?env=${env}`, fetchOpts),
        fetch(`/api/leaderboard/cruel?env=${env}`, fetchOpts),
        fetch(`/api/leaderboard/metadata?env=${env}`, fetchOpts),
      ]);

      if (normalRes.ok) {
        const data = await normalRes.json();
        logger.log(`${env} Normal leaderboard:`, data);
        setNormalLeaderboard(Array.isArray(data) ? data : []);
      } else {
        logger.error(`${env} Normal leaderboard failed:`, normalRes.status);
      }

      if (cruelRes.ok) {
        const data = await cruelRes.json();
        logger.log(`${env} Cruel leaderboard:`, data);
        setCruelLeaderboard(Array.isArray(data) ? data : []);
      } else {
        logger.error(`${env} Cruel leaderboard failed:`, cruelRes.status);
      }

      if (metaRes.ok) {
        const data = await metaRes.json();
        setLastUpdated(data.lastUpdated);
      }

      if (!normalRes.ok && !cruelRes.ok) {
        toast({
          title: t("common:status.error"),
          description: t("ui:leaderboard.loadFailed"),
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("Failed to fetch leaderboard:", error);
      toast({
        title: t("common:status.error"),
        description: t("ui:leaderboard.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!tempUsername.trim()) {
      toast({
        title: t("ui:leaderboard.invalidUsername"),
        description: t("ui:leaderboard.usernameEmpty"),
        variant: "destructive",
      });
      return;
    }

    if (tempUsername.length > 20) {
      toast({
        title: t("ui:leaderboard.invalidUsername"),
        description: t("ui:leaderboard.usernameTooLong"),
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: t("common:status.error"),
          description: t("ui:leaderboard.mustSignIn"),
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
            title: t("ui:leaderboard.usernameNotAllowed"),
            description: t("ui:leaderboard.usernameInappropriate"),
            variant: "destructive",
          });
          return;
        }
        if (response.status === 409) {
          toast({
            title: t("ui:leaderboard.usernameTaken"),
            description: t("ui:leaderboard.usernameTakenDesc"),
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to update username");
      }

      setUsername(tempUsername.trim());
      setEditingUsername(false);

      toast({
        title: t("ui:leaderboard.usernameSaved"),
        description: t("ui:leaderboard.usernameSavedDesc"),
      });

      fetchLeaderboards();
    } catch (error) {
      logger.error("Failed to save username:", error);
      toast({
        title: t("common:status.error"),
        description: t("ui:leaderboard.saveFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="[--adc-dialog-max-w:42rem] max-h-[80vh] flex flex-col overflow-hidden z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("ui:leaderboard.title")}</span>
            {isDev && (
              <div className="flex items-center gap-2">
                <Label htmlFor="env-switch" className="text-sm font-normal">
                  {useDevStats ? t("ui:leaderboard.dev") : t("ui:leaderboard.prod")}
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
                    placeholder={t("ui:leaderboard.enterName")}
                    maxLength={12}
                    className="h-9 w-32"
                  />
                  <Button onClick={handleSaveUsername} size="sm">
                    {t("common:buttons.save")}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingUsername(false);
                      setTempUsername(username || "");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    {t("common:buttons.cancel")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t("ui:leaderboard.username")}
                    </span>
                    <span className="font-medium">{username || t("ui:leaderboard.notSet")}</span>
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
                      {t("ui:leaderboard.currentPlaytime")}
                    </span>
                    <span className="font-mono">{formatTime(useGameStore.getState().playTime)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="normal" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-1">
            <TabsTrigger value="normal">{t("ui:leaderboard.normalMode")}</TabsTrigger>
            <TabsTrigger value="cruel">{t("ui:leaderboard.cruelMode")}</TabsTrigger>
          </TabsList>
          <TabsContent value="normal" className="flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            <LeaderboardTab
              entries={normalLeaderboard}
              loading={loading}
              lastUpdated={lastUpdated}
              tabId="normal"
            />
          </TabsContent>
          <TabsContent value="cruel" className="flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            <LeaderboardTab
              entries={cruelLeaderboard}
              loading={loading}
              lastUpdated={lastUpdated}
              tabId="cruel"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
