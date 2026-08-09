import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SharedProgressShaderHost,
  SharedProgressShaderSegment,
} from "@/components/ui/shared-progress-shader";
import { DemoSection } from "@/pages/animations-demo/DemoSection";

/** 0–1 fill for segment `index` from a 0–100 value across `segments` buckets. */
function getSegmentFill(
  value: number,
  segments: number,
  index: number,
): number {
  if (segments <= 0) return 0;
  const units = Math.min(segments, Math.max(0, (value / 100) * segments));
  return Math.min(1, Math.max(0, units - index));
}

const DEMO_BARS: { label: string; segments: number; value: number }[] = [
  { label: "3 segments", segments: 3, value: 70 },
  { label: "5 segments", segments: 5, value: 60 },
  { label: "8 segments", segments: 8, value: 55 },
  { label: "12 segments", segments: 12, value: 65 },
  { label: "20 segments", segments: 20, value: 50 },
];

function ShaderProgressBar({
  label,
  segments,
  value,
}: {
  label: string;
  segments: number;
  value: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {Math.round(value)}%
        </span>
      </div>
      <div
        className="flex gap-[3px] py-0.5"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const fill = getSegmentFill(value, segments, index);
          return (
            <div
              key={index}
              className="relative h-8 flex-1 overflow-hidden rounded-[4px] bg-neutral-800"
            >
              {fill > 0 ? (
                <SharedProgressShaderSegment
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${fill * 100}%` }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SharedProgressShaderSection() {
  const [seed, setSeed] = useState(0);
  // Nudge values slightly so remounts / rerenders are easy while inspecting.
  const bars = DEMO_BARS.map((bar, i) => ({
    ...bar,
    value: Math.min(100, Math.max(8, bar.value + ((seed + i) % 5) * 4)),
  }));

  return (
    <DemoSection
      id="shared-progress-shader"
      title="Shared progress shader"
      description="One red Smoke-flow WebGL context. Each segment is a scissor window into the same field (screen UVs), so pieces show different parts without per-bar canvases."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={() => setSeed((s) => s + 1)}
        >
          Nudge fills
        </Button>
      </div>

      <SharedProgressShaderHost className="w-full max-w-3xl space-y-4 rounded-md border border-border/50 bg-neutral-950/80 p-4">
        {bars.map((bar) => (
          <ShaderProgressBar
            key={bar.label}
            label={bar.label}
            segments={bar.segments}
            value={bar.value}
          />
        ))}
      </SharedProgressShaderHost>

      <p className="max-w-3xl text-2xs text-muted-foreground">
        Fallback on reduced-motion / low-RAM / WebGL failure: solid{" "}
        <code className="text-foreground">bg-red-950</code> fills. Shop Insight
        banner stays on its own blue <code className="text-foreground">SmokeShader</code>.
      </p>
    </DemoSection>
  );
}
