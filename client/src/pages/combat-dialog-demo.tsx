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
  const { initialize, updateBastionStats } = useGameStore.getState();
  initialize(buildCombatDemoGameState(config) as GameState);
  updateBastionStats();
}

function patchDemoConfigOnStore(config: CombatDemoConfig) {
  useGameStore.setState((state) => ({
    ...state,
    flags: {
      ...state.flags,
      hasFortress: config.hasFortress,
    },
    clothing: {
      ...state.clothing,
      grenadier_bag: config.grenadierBag,
      flask_harness: config.flaskHarness,
    },
    combatSkills: {
      crushingStrikeLevel: config.crushingStrikeLevel,
      bloodflameSphereLevel: config.bloodflameSphereLevel,
    },
    story: {
      ...state.story,
      seen: {
        ...state.story?.seen,
        restlessKnightWounded: config.restlessKnightWounded,
        elderWizardWounded: config.elderWizardWounded,
      },
    },
  }));
  useGameStore.getState().updateBastionStats();
}

export default function CombatDialogDemo() {
  const [config, setConfig] = useState<CombatDemoConfig>(
    COMBAT_DEMO_DEFAULT_CONFIG,
  );
  const [enemyPreset, setEnemyPreset] = useState<EnemyPresetId>("training");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    mountNotoSansSymbols2FontFace();
    applyDemoConfigToStore(COMBAT_DEMO_DEFAULT_CONFIG);
  }, []);

  const openCombatDialog = useCallback(() => {
    patchDemoConfigOnStore(config);
    useGameStore.setState((state) => ({
      ...state,
      resources: {
        ...state.resources,
        ...combatDemoResourceStock(),
      },
    }));
    setDialogKey((key) => key + 1);
    setDialogOpen(true);
  }, [config]);

  const resupplyItems = useCallback(() => {
    useGameStore.setState((state) => ({
      ...state,
      resources: {
        ...state.resources,
        ...combatDemoResourceStock(),
      },
    }));
  }, []);

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
            . Seeds max combat items, Nightshade Bow poison arrows, Grenadier&apos;s
            Bag / Flask Harness capacity, and fellowship combat skills.
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

        <section className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
          <h2 className="text-sm font-medium">Fellowship skills</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>Crushing Strike level ({config.crushingStrikeLevel})</span>
              <input
                type="range"
                min={0}
                max={MAX_CRUSHING_LEVEL}
                value={config.crushingStrikeLevel}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    crushingStrikeLevel: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>
                Bloodflame Sphere level ({config.bloodflameSphereLevel})
              </span>
              <input
                type="range"
                min={0}
                max={MAX_BLOODFLAME_LEVEL}
                value={config.bloodflameSphereLevel}
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
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.restlessKnightWounded}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    restlessKnightWounded: e.target.checked,
                  }))
                }
              />
              Restless Knight wounded
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.elderWizardWounded}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    elderWizardWounded: e.target.checked,
                  }))
                }
              />
              Elder Wizard wounded
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
          <h2 className="text-sm font-medium">Loadout toggles</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.grenadierBag}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    grenadierBag: e.target.checked,
                  }))
                }
              />
              Grenadier&apos;s Bag
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.flaskHarness}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    flaskHarness: e.target.checked,
                  }))
                }
              />
              Flask Harness
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.hasFortress}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    hasFortress: e.target.checked,
                  }))
                }
              />
              Fortress label
            </label>
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
        eventMessage="A dev-only combat encounter. Use bombs, Veinfire Elixir, Poison Arrows, Crushing Strike, and Bloodflame Sphere."
        onVictory={() => MOCK_VICTORY_SUMMARY}
        onDefeat={() => MOCK_DEFEAT_SUMMARY}
      />
    </div>
  );
}
