import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImproveButton } from "@/components/ui/improve-button";
import AttackWavesProgressBar from "@/components/ui/attack-waves-progress";
import {
  EstateStyleProgress,
  SharedProgressShaderHost,
} from "@/components/ui/shared-progress-shader";
import { TOTAL_ATTACK_WAVES } from "@/game/rules/attackWaveOrder";
import { DemoSection } from "@/pages/animations-demo/DemoSection";
import { useDemoShaderVisible } from "@/pages/animations-demo/useDemoShaderVisible";

const DEMO_BARS: { label: string; segments: number }[] = [
  { label: "3 segments", segments: 3 },
  { label: "5 segments", segments: 5 },
  { label: "8 segments", segments: 8 },
  { label: "12 segments", segments: 12 },
  { label: "20 segments", segments: 20 },
];

function EstateStyleShaderBar({
  label,
  segments,
  level,
  onImprove,
  onReset,
  buttonId,
}: {
  label: string;
  segments: number;
  level: number;
  onImprove: () => void;
  onReset: () => void;
  buttonId?: string;
}) {
  return (
    <div className="w-full space-y-1">
      <div className="flex h-6 items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <div className="flex h-5 shrink-0 items-center justify-end gap-2 pb-1">
          {level < segments ? (
            <ImproveButton
              onClick={onImprove}
              disabled={false}
              button_id={buttonId ?? `demo-shader-improve-${segments}`}
            />
          ) : null}
          <Button size="xs" variant="outline" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
      <EstateStyleProgress
        value={(level / segments) * 100}
        segments={segments}
      />
      <p className="text-xs text-muted-foreground">
        Level {level}/{segments}
      </p>
    </div>
  );
}

export function SharedProgressShaderSection() {
  const [levels, setLevels] = useState(() => DEMO_BARS.map(() => 0));
  const [lateLevel, setLateLevel] = useState(2);
  const [showLateBar, setShowLateBar] = useState(false);
  const shaderVisible = useDemoShaderVisible("shared-progress-shader");

  return (
    <DemoSection
      id="shared-progress-shader"
      title="Shared progress shader"
      description="Estate-style SegmentedProgress (Improve, 1s grow, sparks) with one shared red Smoke-flow shader. Each segment is a scissor window into the same field."
    >
      <SharedProgressShaderHost
        className="w-full max-w-md rounded-md border border-border/50 bg-neutral-950/80 p-4"
        visible={shaderVisible}
      >
        <div className="space-y-4">
          {DEMO_BARS.map((bar, index) => (
            <EstateStyleShaderBar
              key={bar.label}
              label={bar.label}
              segments={bar.segments}
              level={levels[index] ?? 0}
              onImprove={() =>
                setLevels((prev) =>
                  prev.map((level, i) =>
                    i === index ? Math.min(bar.segments, level + 1) : level,
                  ),
                )
              }
              onReset={() =>
                setLevels((prev) =>
                  prev.map((level, i) => (i === index ? 0 : level)),
                )
              }
            />
          ))}
          {showLateBar ? (
            <EstateStyleShaderBar
              label="Late skill (after mount)"
              segments={5}
              level={lateLevel}
              buttonId="demo-shader-improve-late"
              onImprove={() => setLateLevel((level) => Math.min(5, level + 1))}
              onReset={() => setLateLevel(0)}
            />
          ) : null}
        </div>
      </SharedProgressShaderHost>

      <div className="flex flex-wrap gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={() => setShowLateBar(true)}
          disabled={showLateBar}
        >
          Add late skill row
        </Button>
        {showLateBar ? (
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setShowLateBar(false);
              setLateLevel(2);
            }}
          >
            Remove late skill
          </Button>
        ) : null}
      </div>

      <p className="max-w-md text-2xs text-muted-foreground">
        Same chrome as estate upgrade bars (`h-2`, Improve, grow sparks). Shader
        fallback: solid <code className="text-foreground">bg-red-950</code>.
      </p>
    </DemoSection>
  );
}

export function AttackWavesBarSection() {
  const [completedWaves, setCompletedWaves] = useState(3);
  const value = (completedWaves / TOTAL_ATTACK_WAVES) * 100;
  const shaderVisible = useDemoShaderVisible("attack-waves-bar");

  return (
    <DemoSection
      id="attack-waves-bar"
      title="Attack waves chart"
      description="Bastion-tab AttackWavesChart. Tweak ATTACK_WAVES_PROGRESS_STYLE in attackWavesProgressStyle.ts."
    >
      <div className="w-full max-w-md rounded-md border border-border/50 bg-neutral-950/80 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              Attack Waves
            </span>
            <span className="text-xs text-muted-foreground">
              {completedWaves}/{TOTAL_ATTACK_WAVES}
            </span>
          </div>
          <AttackWavesProgressBar
            value={value}
            segments={TOTAL_ATTACK_WAVES}
            visible={shaderVisible}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={() =>
            setCompletedWaves((n) => Math.min(TOTAL_ATTACK_WAVES, n + 1))
          }
          disabled={completedWaves >= TOTAL_ATTACK_WAVES}
        >
          Complete wave
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setCompletedWaves(0)}
        >
          Reset
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setCompletedWaves(TOTAL_ATTACK_WAVES)}
        >
          All 12
        </Button>
      </div>
    </DemoSection>
  );
}
