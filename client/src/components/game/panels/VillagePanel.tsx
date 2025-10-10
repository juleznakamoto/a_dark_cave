import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
} from "@/game/rules";
import CooldownButton from "@/components/CooldownButton";
import { Button } from "@/components/ui/button";
import { getPopulationProduction } from "@/game/population";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { capitalizeWords } from "@/lib/utils";

export default function VillagePanel() {
  const {
    villagers,
    buildings,
    story,
    executeAction,
    assignVillager,
    unassignVillager,
  } = useGameStore();
  const state = useGameStore.getState();

  // Production progress is not needed for display - removed unused calculation
  const productionProgress = 0;

  // Define action groups with their actions
  const actionGroups = [
    {
      title: "Build",
      actions: [
        { id: "buildWoodenHut", label: "Wooden Hut" },
        { id: "buildStoneHut", label: "Stone Hut" },
        { id: "buildLonghouse", label: "Longhouse" },
        { id: "buildCabin", label: "Cabin" },
        { id: "buildBlacksmith", label: "Blacksmith" },
        { id: "buildShallowPit", label: "Shallow Pit" },
        { id: "buildDeepeningPit", label: "Deepening Pit" },
        { id: "buildDeepPit", label: "Deep Pit" },
        { id: "buildBottomlessPit", label: "Bottomless Pit" },
        { id: "buildFoundry", label: "Foundry" },
        { id: "buildAltar", label: "Altar" },
        { id: "buildShrine", label: "Shrine" },
        { id: "buildTemple", label: "Temple" },
        { id: "buildSanctum", label: "Sanctum" },
        { id: "buildGreatCabin", label: "Great Cabin" },
        { id: "buildTimberMill", label: "Timber Mill" },
        { id: "buildQuarry", label: "Quarry" },
        { id: "buildClerksHut", label: "Clerk's Hut" },
        { id: "buildScriptorium", label: "Scriptorium" },
        { id: "buildTannery", label: "Tannery" },
        { id: "buildAlchemistHall", label: "Alchemist's Hall" },
        { id: "buildTradePost", label: "Trade Post" },
        { id: "buildWizardTower", label: "Wizard Tower" },
        { id: "buildGrandBlacksmith", label: "Grand Blacksmith" },
        { id: "buildBastion", label: "Bastion" },
        { id: "buildWatchtower", label: "Watchtower" },
        { id: "buildPalisades", label: "Palisades" },
      ],
    },
  ];

  // Define population jobs
  const populationJobs = [
    { id: "gatherer", label: "Gatherer", alwaysShow: true },
    { id: "hunter", label: "Hunter", showWhen: () => buildings.cabin > 0 },
    {
      id: "iron_miner",
      label: "Iron Miner",
      showWhen: () => buildings.shallowPit >= 1,
    },
    {
      id: "coal_miner",
      label: "Coal Miner",
      showWhen: () => buildings.shallowPit >= 1,
    },
    {
      id: "steel_forger",
      label: "Steel Forger",
      showWhen: () => state.buildings.foundry >= 1,
    },
    {
      id: "sulfur_miner",
      label: "Sulfur Miner",
      showWhen: () => buildings.deepeningPit >= 1,
    },
    {
      id: "silver_miner",
      label: "Silver Miner",
      showWhen: () => buildings.deepeningPit >= 1,
    },
    {
      id: "obsidian_miner",
      label: "Obsidian Miner",
      showWhen: () => buildings.deepPit >= 1,
    },
    {
      id: "adamant_miner",
      label: "Adamant Miner",
      showWhen: () => buildings.bottomlessPit >= 1,
    },
    {
      id: "moonstone_miner",
      label: "Moonstone Miner",
      showWhen: () => buildings.bottomlessPit >= 1,
    },
    {
      id: "tanner",
      label: "Tanner",
      alwaysShow: false,
      showWhen: () => state.buildings.tannery >= 1,
    },
    {
      id: "powder_maker",
      label: "Powder Maker",
      showWhen: () => buildings.alchemistHall >= 1,
    },
    {
      id: "cinderflame_dust_maker",
      label: "Cinderflame Dust Maker",
      showWhen: () => state.story?.seen?.alchemistArrives === true,
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);
    const costBreakdown = getActionCostBreakdown(actionId, state);

    // Dynamic label for watchtower based on current level
    let displayLabel = label;
    if (actionId === "buildWatchtower") {
      const watchtowerLevel = buildings.watchtower || 0;
      const watchtowerLabels = [
        "Watchtower",
        "Guard Tower",
        "Fortified Tower",
        "Cannon Tower",
      ];
      displayLabel = watchtowerLabels[watchtowerLevel] || "Watchtower";
    }

    // Dynamic label for palisades based on current level
    if (actionId === "buildPalisades") {
      const palisadesLevel = buildings.palisades || 0;
      const palisadesLabels = [
        "Wooden Palisades",
        "Fortified Palisades",
        "Stone Wall",
        "Reinforced Wall",
      ];
      displayLabel = palisadesLabels[palisadesLevel] || "Wooden Palisades";
    }

    return (
      <HoverCard key={actionId} openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div>
            <CooldownButton
              onClick={() => executeAction(actionId)}
              cooldownMs={action.cooldown * 1000}
              data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
              disabled={!canExecute}
              size="xs"
              variant="outline"
              className="hover:bg-transparent hover:text-foreground"
            >
              {displayLabel}
            </CooldownButton>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto p-2">
          <div className="text-xs whitespace-nowrap">
            {costBreakdown.map((cost, index) => (
              <div
                key={index}
                className={`${
                  cost.satisfied ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {cost.text}
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const renderPopulationControl = (jobId: string, label: string) => {
    const currentCount = villagers[jobId as keyof typeof villagers] || 0;

    // Get total production for this job type
    const getTotalProductionText = (jobId: string, count: number): string => {
      if (count === 0) return "";

      const production = getPopulationProduction(jobId, count, state);
      const productionText = production
        .map(
          (prod) =>
            `${prod.totalAmount > 0 ? "+" : ""}${prod.totalAmount} ${capitalizeWords(prod.resource)}`,
        )
        .join(", ");

      return productionText ? ` ${productionText}` : "";
    };

    return (
      <div key={jobId} className="flex items-center justify-between">
        <span className="text-sm">
          {label}{" "}
          <span className="text-muted-foreground">
            {getTotalProductionText(jobId, currentCount)}
          </span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => unassignVillager(jobId)}
            disabled={currentCount === 0}
            variant="ghost"
            size="xs"
            className="h-5 w-5 no-hover"
          >
            -
          </Button>
          <span className="font-mono text-sm w-5 text-center">
            {currentCount}
          </span>
          <Button
            onClick={() => assignVillager(jobId)}
            disabled={villagers.free === 0}
            variant="ghost"
            size="xs"
            className="h-5 w-5 no-hover"
          >
            +
          </Button>
        </div>
      </div>
    );
  };

  // Filter visible population jobs
  const visiblePopulationJobs = populationJobs.filter((job) => {
    if (job.alwaysShow) return true;
    if (job.showWhen) return job.showWhen();
    return false;
  });

  return (
    <div className="space-y-6">
      {actionGroups.map((group, groupIndex) => {
        const visibleActions = group.actions.filter((action) =>
          shouldShowAction(action.id, state),
        );

        if (visibleActions.length === 0) return null;

        return (
          <div key={groupIndex} className="space-y-2">
            {group.title && (
              <h3 className="text-xs font-semibold text-foreground ">
                {group.title}
              </h3>
            )}
            <div className="flex flex-wrap gap-2">
              {visibleActions.map((action) =>
                renderButton(action.id, action.label),
              )}
            </div>
          </div>
        );
      })}

      {/* Rule Section */}
      {story.seen?.hasVillagers && visiblePopulationJobs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Rule</h3>
          <div className="space-y-1 leading-tight">
            {visiblePopulationJobs.map((job) =>
              renderPopulationControl(job.id, job.label),
            )}
          </div>
          {/* Population Effects Summary */}
          {(() => {
            const totalEffects: Record<string, number> = {};

            visiblePopulationJobs.forEach((job) => {
              const currentCount =
                villagers[job.id as keyof typeof villagers] || 0;
              if (currentCount > 0) {
                const production = getPopulationProduction(
                  job.id,
                  currentCount,
                  state,
                );
                production.forEach((prod) => {
                  totalEffects[prod.resource] =
                    (totalEffects[prod.resource] || 0) + prod.totalAmount;
                });
              }
            });

            const effectsText = Object.entries(totalEffects)
              .filter(([resource, amount]) => amount !== 0)
              .sort(([, a], [, b]) => b - a) // Sort from positive to negative
              .map(
                ([resource, amount]) =>
                  `${amount > 0 ? "+" : ""}${amount} ${capitalizeWords(resource)}`,
              )
              .join(", ");

            return effectsText && buildings.clerksHut > 0 ? (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <CircularProgress
                  value={productionProgress}
                  size={14}
                  strokeWidth={2}
                  className="text-primary"
                />
                <span>{effectsText}</span>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}