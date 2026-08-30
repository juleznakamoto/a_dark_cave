import { ATTACK_WAVES_PROGRESS_STYLE } from "@/game/attackWavesProgressStyle";
import { SegmentedProgress } from "@/components/ui/progress-bar";
import {
  SharedProgressShaderHost,
  SharedProgressShaderSegment,
} from "@/components/ui/shared-progress-shader";

/**
 * Bastion attack-waves SegmentedProgress. Chrome comes from
 * `attackWavesProgressStyle.ts`.
 */
export default function AttackWavesProgressBar({
  value,
  segments,
  visible = true,
}: {
  value: number;
  segments: number;
  /** False while Bastion stays mounted but hidden. Parks the shared shader. */
  visible?: boolean;
}) {
  const style = ATTACK_WAVES_PROGRESS_STYLE;
  return (
    <SharedProgressShaderHost
      className="w-full"
      visible={visible}
      colorTokens={style.shaderColorTokens}
      rimFilledClass={style.rimClassName}
      fallbackClass={style.shaderFallbackClassName}
    >
      <SegmentedProgress
        value={value}
        segments={segments}
        showPercentage={false}
        compact
        growAnimationMs={style.growAnimationMs}
        emitSparksOnGrow={style.emitSparksOnGrow}
        disableGlow={style.disableGlow}
        filledClassName={style.filledClassName}
        emptyClassName={style.emptyClassName}
        segmentClassName={style.segmentClassName}
        rimFilledClassName={style.rimClassName}
        renderFill={() => (
          <SharedProgressShaderSegment className="absolute inset-0" />
        )}
      />
    </SharedProgressShaderHost>
  );
}
