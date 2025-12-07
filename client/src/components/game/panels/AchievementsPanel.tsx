
import { useGameStore } from "@/game/state";
import { ACHIEVEMENTS, getAchievementProgress, getCategoryColor, getCategoryName } from "@/game/achievements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AchievementsPanel() {
  const state = useGameStore();
  const { unlockedAchievements, unlockAchievement } = useGameStore();

  // Check for newly unlocked achievements
  useEffect(() => {
    ACHIEVEMENTS.forEach((achievement) => {
      if (!unlockedAchievements.includes(achievement.id)) {
        if (achievement.requirement(state)) {
          unlockAchievement(achievement.id);
        }
      }
    });
  }, [state, unlockedAchievements, unlockAchievement]);

  const achievementsByCategory = useMemo(() => {
    const categories: Record<string, typeof ACHIEVEMENTS> = {};
    ACHIEVEMENTS.forEach((achievement) => {
      if (!categories[achievement.category]) {
        categories[achievement.category] = [];
      }
      categories[achievement.category].push(achievement);
    });
    return categories;
  }, []);

  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;
  const completionPercentage = Math.round((unlockedCount / totalAchievements) * 100);

  const AchievementCard = ({ achievement }: { achievement: typeof ACHIEVEMENTS[0] }) => {
    const isUnlocked = unlockedAchievements.includes(achievement.id);
    const progress = getAchievementProgress(achievement, state);

    return (
      <Card className={`${isUnlocked ? 'border-primary/50 bg-primary/5' : 'border-border/50 opacity-60'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-4xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                {achievement.icon}
              </div>
              <div>
                <CardTitle className="text-base">{achievement.title}</CardTitle>
                <CardDescription className="text-sm">
                  {achievement.description}
                </CardDescription>
              </div>
            </div>
            {isUnlocked && (
              <Badge variant="default" className="ml-2">
                ✓
              </Badge>
            )}
          </div>
        </CardHeader>
        {!isUnlocked && (
          <CardContent className="pt-0">
            <Progress value={progress} className="h-2" />
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-bold">
                {unlockedCount} / {totalAchievements}
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {completionPercentage}%
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="exploration">Explore</TabsTrigger>
          <TabsTrigger value="combat">Combat</TabsTrigger>
          <TabsTrigger value="building">Build</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="story">Story</TabsTrigger>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="all" className="mt-0">
            <div className="space-y-3 pr-4">
              {ACHIEVEMENTS.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </TabsContent>

          {Object.entries(achievementsByCategory).map(([category, achievements]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="mb-4">
                <h3 className={`text-xl font-bold ${getCategoryColor(category as any)}`}>
                  {getCategoryName(category as any)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {achievements.filter(a => unlockedAchievements.includes(a.id)).length} / {achievements.length} unlocked
                </p>
              </div>
              <div className="space-y-3 pr-4">
                {achievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
