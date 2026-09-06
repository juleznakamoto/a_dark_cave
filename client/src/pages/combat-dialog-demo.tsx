import { useCallback, useEffect, useState } from "react";
import { Redirect } from "wouter";
import CombatDialog from "@/components/game/CombatDialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import type { GameState } from "@shared/schema";
import type { CombatResultSummary } from "@/game/types";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  CRUSHING_STRIKE_UPGRADES,
  FERAL_HOWL_UPGRADES,
} from "@/game/rules/skillUpgrades";
import {
  buildCombatDemoEnemy,
  buildCombatDemoGameState,
  combatDemoResourceStock,
  COMBAT_DEMO_DEFAULT_CONFIG,
  ENEMY_PRESETS,
  type CombatDemoConfig,
  type EnemyPresetId,
} from "@/pages/combat-dialog-demo/seedState";

const MAX_CRUSHING_LEVEL = CRUSHING_STRIKE_UPGRADES.length - 1;
const MAX_BLOODFLAME_LEVEL = BLOODFLAME_SPHERE_UPGRADES.length - 1;
const MAX_FERAL_HOWL_LEVEL = FERAL_HOWL_UPGRADES.length - 1;

const MOCK_VICTORY_SUMMARY: CombatResultSummary = {
  silverReward: 75,
  goldReward: 150,
};

const MOCK_DEFEAT_SUMMARY: CombatResultSummary = {
  casualties: 3,
  woundedFellows: ["restless_knight", "elder_wizard"],
  damagedBuildings: ["bastion", "watchtower"],
  madnessGain: 2,
};

function applyDemoConfigToStore(config: CombatDemoConfig) {
  const { initialize, updateEffects, updateStats, updateBastionStats } =
    useGameStore.getState();
  initialize(buildCombatDemoGameState(config) as GameState);
  // Recalculate from owned gear/blessings so CombatDialog luck/crit/madness match
  // a real late-game fight (hardcoded stats.luck is ignored by getTotalLuck).
  updateEffects();
  updateStats();
  updateBastionStats();
}

function DemoToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default function CombatDialogDemo() {
  const [config, setConfig] = useState<CombatDemoConfig>(
    COMBAT_DEMO_DEFAULT_CONFIG,
  );
  const [enemyPreset, setEnemyPreset] = useState<EnemyPresetId>(() => {
    if (typeof window === "undefined") return "training";
    const param = new URLSearchParams(window.location.search).get("enemy");
    return param && param in ENEMY_PRESETS
      ? (param as EnemyPresetId)
      : "training";
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    mountNotoSansSymbols2FontFace();
    applyDemoConfigToStore(COMBAT_DEMO_DEFAULT_CONFIG);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const url = new URL(window.location.href);
    if (enemyPreset === "training") {
      url.searchParams.delete("enemy");
    } else {
      url.searchParams.set("enemy", enemyPreset);
    }
    window.history.replaceState(null, "", url.toString());
  }, [enemyPreset]);

  const openCombatDialog = useCallback(() => {
    applyDemoConfigToStore(config);
    setDialogKey((key) => key + 1);
    setDialogOpen(true);
  }, [config]);

  const resupplyItems = useCallback(() => {
    useGameStore.setState((state) => ({
      ...state,
      resources: {
        ...state.resources,
        ...combatDemoResourceStock(config),
      },
    }));
  }, [config]);

  const resetDemoState = useCallback(() => {
    setConfig(COMBAT_DEMO_DEFAULT_CONFIG);
    applyDemoConfigToStore(COMBAT_DEMO_DEFAULT_CONFIG);
    setDialogOpen(false);
  }, []);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const enemy = buildCombatDemoEnemy(enemyPreset);

  return (
    <div className="min-h-[100dvh] w-full bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-lg font-semibold">Combat dialog playground</h1>
          <p className="text-sm text-muted-foreground">
            Dev-only sandbox at{" "}
            <code className="text-xs text-foreground/80">/dev/combat-dialog</code>
            . Seeds a late-game loadout (luck/crit/madness gear, Nightshade Bow,
            bombs, fellowship skills) so the dialog matches a real fight 1:1.
          </p>
        </header>

        <section className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
          <h2 className="text-sm font-medium">Enemy preset</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ENEMY_PRESETS) as EnemyPresetId[]).map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={enemyPreset === id ? "default" : "outline"}
                onClick={() => setEnemyPreset(id)}
              >
                {ENEMY_PRESETS[id].label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {ENEMY_PRESETS[enemyPreset].maxHealth} HP ·{" "}
            {ENEMY_PRESETS[enemyPreset].attack} attack
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
          <h2 className="text-sm font-medium">Combat items</h2>
          <p className="text-xs text-muted-foreground">
            All on by default. Uncheck to hide that button in the fight.
          </p>
          <div className="flex flex-wrap gap-4">
            <DemoToggle
              label="Ember Bomb"
              checked={config.emberBomb}
              onChange={(emberBomb) =>
                setConfig((prev) => ({ ...prev, emberBomb }))
              }
            />
            <DemoToggle
              label="Ashfire Bomb"
              checked={config.ashfireBomb}
              onChange={(ashfireBomb) =>
                setConfig((prev) => ({ ...prev, ashfireBomb }))
              }
            />
            <DemoToggle
              label="Void Bomb"
              checked={config.voidBomb}
              onChange={(voidBomb) =>
                setConfig((prev) => ({ ...prev, voidBomb }))
              }
            />
            <DemoToggle
              label="Veinfire Elixir"
              checked={config.veinfireElixir}
              onChange={(veinfireElixir) =>
                setConfig((prev) => ({ ...prev, veinfireElixir }))
              }
            />
            <DemoToggle
              label="Poison Arrows"
              checked={config.poisonArrows}
              onChange={(poisonArrows) =>
                setConfig((prev) => ({ ...prev, poisonArrows }))
              }
            />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
          <h2 className="text-sm font-medium">Fellowship skills</h2>
          <p className="text-xs text-muted-foreground">
            All on by default. Uncheck to hide that skill.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <DemoToggle
                label="Crushing Strike"
                checked={config.crushingStrike}
                onChange={(crushingStrike) =>
                  setConfig((prev) => ({ ...prev, crushingStrike }))
                }
              />
              <label className="space-y-2 text-sm">
                <span>Level ({config.crushingStrikeLevel})</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_CRUSHING_LEVEL}
                  value={config.crushingStrikeLevel}
                  disabled={!config.crushingStrike}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      crushingStrikeLevel: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </label>
            </div>
            <div className="space-y-2">
              <DemoToggle
                label="Bloodflame Sphere"
                checked={config.bloodflameSphere}
                onChange={(bloodflameSphere) =>
                  setConfig((prev) => ({ ...prev, bloodflameSphere }))
                }
              />
              <label className="space-y-2 text-sm">
                <span>Level ({config.bloodflameSphereLevel})</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_BLOODFLAME_LEVEL}
                  value={config.bloodflameSphereLevel}
                  disabled={!config.bloodflameSphere}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      bloodflameSphereLevel: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </label>
            </div>
            <div className="space-y-2">
              <DemoToggle
                label="Feral Howl"
                checked={config.feralHowl}
                onChange={(feralHowl) =>
                  setConfig((prev) => ({ ...prev, feralHowl }))
                }
              />
              <label className="space-y-2 text-sm">
                <span>Level ({config.feralHowlLevel})</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_FERAL_HOWL_LEVEL}
                  value={config.feralHowlLevel}
                  disabled={!config.feralHowl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      feralHowlLevel: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <DemoToggle
              label="Restless Knight wounded"
              checked={config.restlessKnightWounded}
              disabled={!config.crushingStrike}
              onChange={(restlessKnightWounded) =>
                setConfig((prev) => ({ ...prev, restlessKnightWounded }))
              }
            />
            <DemoToggle
              label="Elder Wizard wounded"
              checked={config.elderWizardWounded}
              disabled={!config.bloodflameSphere}
              onChange={(elderWizardWounded) =>
                setConfig((prev) => ({ ...prev, elderWizardWounded }))
              }
            />
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
          <h2 className="text-sm font-medium">Loadout toggles</h2>
          <div className="flex flex-wrap gap-4">
            <DemoToggle
              label="Grenadier's Bag"
              checked={config.grenadierBag}
              onChange={(grenadierBag) =>
                setConfig((prev) => ({ ...prev, grenadierBag }))
              }
            />
            <DemoToggle
              label="Flask Harness"
              checked={config.flaskHarness}
              onChange={(flaskHarness) =>
                setConfig((prev) => ({ ...prev, flaskHarness }))
              }
            />
            <DemoToggle
              label="Fortress label"
              checked={config.hasFortress}
              onChange={(hasFortress) =>
                setConfig((prev) => ({ ...prev, hasFortress }))
              }
            />
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCombatDialog}>
            {dialogOpen ? "Reopen combat" : "Open combat dialog"}
          </Button>
          <Button type="button" variant="outline" onClick={resupplyItems}>
            Resupply items
          </Button>
          <Button type="button" variant="outline" onClick={resetDemoState}>
            Reset demo state
          </Button>
        </section>

        <p className="text-xs text-muted-foreground">
          Victory and defeat overlays use mock summaries (rewards, casualties,
          wounded fellows, building damage, madness). Close the dialog and reopen
          after changing settings so fellowship flags refresh.
        </p>
      </div>

      <CombatDialog
        key={dialogKey}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        enemy={enemy}
        eventTitle="Pale Creatures approach"
        eventMessage="A dev-only combat encounter. Use bombs, Veinfire Elixir, Poison Arrows, Crushing Strike, Bloodflame Sphere, and Feral Howl."
        onVictory={() => MOCK_VICTORY_SUMMARY}
        onDefeat={() => MOCK_DEFEAT_SUMMARY}
      />
    </div>
  );
}
