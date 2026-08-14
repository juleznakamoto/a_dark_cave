import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  audioManager,
  caveExploreVolume,
  feedFireVolume,
  SOUND_VOLUME,
} from "@/lib/audio";

type DemoCue = {
  id: string;
  /** Howler key. Defaults to `id`. */
  sound?: string;
  label: string;
  volume: number;
};

const AMBIENCE: DemoCue[] = [
  {
    id: "backgroundMusic",
    label: "Background music",
    volume: SOUND_VOLUME.backgroundMusic,
  },
  { id: "wind", label: "Start-screen wind", volume: SOUND_VOLUME.wind },
  { id: "combat", label: "Combat bed", volume: SOUND_VOLUME.combat },
  {
    id: "eventDialog",
    label: "Event dialog bed",
    volume: SOUND_VOLUME.eventDialog,
  },
  {
    id: "whisperingCube",
    label: "Whispering cube",
    volume: SOUND_VOLUME.whisperingCube,
  },
];

const SFX: DemoCue[] = [
  { id: "lightFire", label: "Light Fire", volume: SOUND_VOLUME.lightFire },
  {
    id: "monsterStart",
    label: "Start-screen eyes",
    volume: SOUND_VOLUME.monsterStart,
  },
  { id: "feedFire", label: "Feed Fire", volume: feedFireVolume(0) },
  {
    id: "gatherWood",
    label: "Cave gather wood",
    volume: SOUND_VOLUME.gatherWood,
  },
  { id: "chopWood", label: "Forest chop wood", volume: SOUND_VOLUME.chopWood },
  { id: "hunt", label: "Hunt / arrow", volume: SOUND_VOLUME.hunt },
  {
    id: "caveExplore",
    label: "Cave explore",
    volume: caveExploreVolume(0),
  },
  { id: "mining", label: "Mining", volume: SOUND_VOLUME.mining },
  { id: "craft", label: "Craft", volume: SOUND_VOLUME.craft },
  {
    id: "buildingComplete",
    label: "Building complete",
    volume: SOUND_VOLUME.buildingComplete,
  },
  { id: "event", label: "Event UI", volume: SOUND_VOLUME.eventUi },
  {
    id: "eventMadness",
    label: "Event madness",
    volume: SOUND_VOLUME.eventMadness,
  },
  { id: "merchant", label: "Merchant", volume: SOUND_VOLUME.merchant },
  { id: "bloodMoon", label: "Blood moon", volume: SOUND_VOLUME.bloodMoon },
  { id: "explosion", label: "Explosion", volume: SOUND_VOLUME.explosion },
  {
    id: "combatWaveIntro",
    label: "Combat wave intro",
    volume: SOUND_VOLUME.combatWaveIntro,
  },
  { id: "sleep", label: "Sleep", volume: SOUND_VOLUME.sleep },
  {
    id: "newVillager",
    label: "New villager",
    volume: SOUND_VOLUME.newVillager,
  },
  { id: "tabFadeIn", label: "Tab fade-in", volume: SOUND_VOLUME.tabFadeIn },
  {
    id: "achievement",
    label: "Achievement bong",
    volume: SOUND_VOLUME.achievement,
  },
];

function volumeLabel(volume: number): string {
  return volume.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export default function SoundsDemo() {
  const [ready, setReady] = useState(false);
  const [looping, setLooping] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await audioManager.preloadSounds();
      await audioManager.loadSound("monsterStart", "/sounds/monster_start.mp3");
      await audioManager.loadGameSounds();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
      audioManager.stopAllSounds();
    };
  }, []);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const toggleAmbience = (cue: DemoCue) => {
    const name = cue.sound ?? cue.id;
    if (looping.has(cue.id) || audioManager.isPlaying(name)) {
      audioManager.stopLoopingSound(name);
      setLooping((prev) => {
        const next = new Set(prev);
        next.delete(cue.id);
        return next;
      });
      return;
    }
    audioManager.playLoopingSound(name, cue.volume);
    setLooping((prev) => new Set(prev).add(cue.id));
  };

  const playSfx = (cue: DemoCue) => {
    audioManager.playSound(cue.sound ?? cue.id, cue.volume);
  };

  const stopAll = () => {
    audioManager.stopAllSounds();
    setLooping(new Set());
  };

  return (
    <ScrollArea className="h-[100dvh] w-full bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 text-foreground">
        <header className="space-y-3">
          <h1 className="text-lg font-semibold">Sound playground</h1>
          <p className="text-sm text-muted-foreground">
            Dev-only. Ambience loops stay on while you fire SFX, so you can hear
            them together. In the real game, event beds fade the music out. Here
            they stack on purpose. Volumes match the live mix.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" variant="outline" onClick={stopAll}>
              Stop all
            </Button>
            <span className="text-xs text-muted-foreground">
              {ready ? "Sounds loaded" : "Loading sounds..."}
            </span>
          </div>
        </header>

        <section className="space-y-3 rounded-md border border-border/60 bg-neutral-950/80 p-4">
          <div>
            <h2 className="text-sm font-semibold">Ambience (toggle, stacks)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Click to start a loop. Click again to stop that loop only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AMBIENCE.map((cue) => {
              const on = looping.has(cue.id);
              return (
                <Button
                  key={cue.id}
                  size="xs"
                  variant={on ? "default" : "outline"}
                  disabled={!ready}
                  onClick={() => toggleAmbience(cue)}
                >
                  {cue.label} ({volumeLabel(cue.volume)})
                </Button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-md border border-border/60 bg-neutral-950/80 p-4">
          <div>
            <h2 className="text-sm font-semibold">SFX (one-shot, stacks)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Click while ambience is running. Repeat clicks overlap.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SFX.map((cue) => (
              <Button
                key={cue.id}
                size="xs"
                variant="outline"
                disabled={!ready}
                onClick={() => playSfx(cue)}
              >
                {cue.label} ({volumeLabel(cue.volume)})
              </Button>
            ))}
          </div>
        </section>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
