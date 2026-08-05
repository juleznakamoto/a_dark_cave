import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ParticleButton } from "@/components/ui/particle-button";
import {
  SuccessParticles,
  useFeedFireParticles,
} from "@/components/ui/feed-fire-particles";
import { useExplosionEffect } from "@/components/ui/explosion-effect";
import VaporizeTextCycle from "@/components/ui/vapour-text-effect";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

export function TextMotionSection() {
  const [counter, setCounter] = useState(12);

  return (
    <DemoSection
      id="text-motion"
      title="Text motion"
      description="Real TextShimmer and AnimatedCounter (shop / idle rewards)."
    >
      <DemoRow label="Shimmer primary">
        <Button disabled className="h-8">
          <TextShimmer>Processing...</TextShimmer>
        </Button>
      </DemoRow>
      <DemoRow label="Shimmer surface">
        <Button variant="outline" disabled className="h-8">
          <TextShimmer tone="onSurface">Loading...</TextShimmer>
        </Button>
      </DemoRow>
      <DemoRow label="Counter">
        <AnimatedCounter value={counter} className="text-lg" />
        <Button
          size="xs"
          variant="outline"
          onClick={() => setCounter((n) => n + 7)}
        >
          +7
        </Button>
        <Button size="xs" variant="outline" onClick={() => setCounter(0)}>
          Reset
        </Button>
      </DemoRow>
    </DemoSection>
  );
}

export function StartScreenFxSection() {
  const [cruel, setCruel] = useState(false);

  return (
    <DemoSection
      id="start-screen-fx"
      title="Start screen effects"
      description="Real ParticleButton (Make Fire) and VaporizeTextCycle."
    >
      <DemoRow label="Make Fire">
        <div className="relative">
          <ParticleButton
            cruelMode={cruel}
            className="fire-hover h-10 bg-transparent px-6 text-lg text-gray-300/90 hover:bg-transparent"
            onClick={() => { }}
          >
            Light Fire
          </ParticleButton>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setCruel((c) => !c)}
        >
          {cruel ? "Cruel on" : "Cruel off"}
        </Button>
      </DemoRow>

      <div className="relative h-24 w-full max-w-md overflow-hidden rounded-md border border-border/50 bg-black">
        <VaporizeTextCycle
          texts={["A Dark Cave", "Light the fire"]}
          color="rgb(250, 250, 250)"
          font={{
            fontFamily: "Georgia, serif",
            fontSize: "28px",
            fontWeight: 400,
          }}
          animation={{
            vaporizeDuration: 1.6,
            fadeInDuration: 0.8,
            waitDuration: 0.8,
          }}
          loop
          play
        />
      </div>
    </DemoSection>
  );
}

export function FeedFireSection() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { sparks, spawnParticles } = useFeedFireParticles();

  return (
    <DemoSection
      id="feed-fire"
      title="Feed fire embers"
      description="Real useFeedFireParticles / SuccessParticles (VillagePanel)."
    >
      <DemoRow label="Spawn">
        <Button
          ref={buttonRef}
          size="sm"
          variant="outline"
          onClick={() => spawnParticles(18, buttonRef)}
        >
          Feed Fire
        </Button>
      </DemoRow>
      <SuccessParticles buttonRef={buttonRef} sparks={sparks} />
    </DemoSection>
  );
}

export function ExplosionSection() {
  const {
    buttonRef,
    triggerExplosion,
    ExplosionEffectRenderer,
  } = useExplosionEffect();

  return (
    <DemoSection
      id="explosion"
      title="Cave explosion"
      description="Real useExplosionEffect (cave collapse / dig deeper)."
    >
      <DemoRow label="Trigger">
        <Button
          ref={buttonRef}
          size="sm"
          variant="outline"
          onClick={() => triggerExplosion()}
        >
          Explode
        </Button>
      </DemoRow>
      <ExplosionEffectRenderer />
    </DemoSection>
  );
}
