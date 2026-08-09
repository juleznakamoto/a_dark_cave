import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImproveButton } from "@/components/ui/improve-button";
import { SegmentedProgress } from "@/components/ui/progress-bar";
import {
  SharedProgressShaderHost,
  SharedProgressShaderSegment,
} from "@/components/ui/shared-progress-shader";
import { DemoSection } from "@/pages/animations-demo/DemoSection";

/** Same grow timing as EstatePanel upgrade bars. */
const ESTATE_BAR_GROW_ANIMATION_MS = 1000;

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
}: {
  label: string;
  segments: number;
  level: number;
  onImprove: () => void;
  onReset: () => void;
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
              button_id={`demo-shader-improve-${segments}`}
            />
          ) : null}
          <Button size="xs" variant="outline" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
      <SegmentedProgress
        value={(level / segments) * 100}
        segments={segments}
        showPercentage={false}
        compact
        growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
        emitSparksOnGrow
        filledClassName="bg-red-950"
        emptyClassName="bg-neutral-800"
        segmentClassName="h-2"
        renderFill={() => (
          <SharedProgressShaderSegment className="absolute inset-0" />
        )}
      />
      <p className="text-xs text-muted-foreground">
        Level {level}/{segments}
      </p>
    </div>
  );
}

export function SharedProgressShaderSection() {
  const [levels, setLevels] = useState(() => DEMO_BARS.map(() => 0));

  return (
    <DemoSection
      id="shared-progress-shader"
      title="Shared progress shader"
      description="Estate-style SegmentedProgress (Improve, 1s grow, sparks) with one shared red Smoke-flow shader. Each segment is a scissor window into the same field."
    >
      <SharedProgressShaderHost className="w-full max-w-md space-y-4 rounded-md border border-border/50 bg-neutral-950/80 p-4">
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
      </SharedProgressShaderHost>

      <p className="max-w-md text-2xs text-muted-foreground">
        Same chrome as estate upgrade bars (`h-2`, Improve, grow sparks). Shader
        fallback: solid <code className="text-foreground">bg-red-950</code>.
      </p>
    </DemoSection>
  );
}
