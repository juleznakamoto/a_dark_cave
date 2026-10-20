/**
 * Loudness of heartbeat.mp3 across one loop (64 even slices, peak = 1).
 * The file never falls silent, so the glow curve below lifts only the thumps.
 */
const HEARTBEAT_ENVELOPE = [
  0.001, 0.027, 0.085, 0.287, 0.69, 0.782, 0.649, 0.543, 0.5, 0.874, 0.855,
  0.686, 0.475, 0.442, 0.516, 0.531, 0.448, 0.425, 0.362, 0.321, 0.234, 0.234,
  0.238, 0.228, 0.689, 0.905, 0.832, 0.527, 0.464, 0.576, 0.921, 0.917, 0.69,
  0.476, 0.437, 0.415, 0.558, 0.61, 0.468, 0.387, 0.357, 0.301, 0.384, 0.357,
  0.394, 0.836, 0.988, 0.677, 0.607, 0.599, 0.65, 0.884, 0.72, 0.517, 0.609,
  0.662, 0.602, 0.516, 0.512, 0.47, 0.343, 0.258, 0.195, 0.125,
] as const;

/** Resting cube-dialog shadow (matches the 0% keyframe of cube-glow-pulse). */
const GLOW_REST = { blur: 18, spread: 2, alpha: 0.32 };
/** Peak cube-dialog shadow (matches the lub keyframe of cube-glow-pulse). */
const GLOW_PEAK = { blur: 28, spread: 4, alpha: 0.48 };

/** 0 at rest between thumps, 1 on the loudest hit in the file. */
export function heartbeatGlowIntensity(loopFraction: number): number {
  const count = HEARTBEAT_ENVELOPE.length;
  if (count === 0) return 0;
  const wrapped = ((loopFraction % 1) + 1) % 1;
  const position = wrapped * count;
  const index = Math.floor(position) % count;
  const next = (index + 1) % count;
  const mix = position - Math.floor(position);
  const raw =
    HEARTBEAT_ENVELOPE[index]! * (1 - mix) + HEARTBEAT_ENVELOPE[next]! * mix;
  const lifted = Math.max(0, (raw - 0.34) / 0.66);
  return lifted ** 1.8;
}

export function cubeHeartbeatBoxShadow(intensity: number): string {
  const t = Math.min(1, Math.max(0, intensity));
  const blur = GLOW_REST.blur + (GLOW_PEAK.blur - GLOW_REST.blur) * t;
  const spread = GLOW_REST.spread + (GLOW_PEAK.spread - GLOW_REST.spread) * t;
  const alpha = GLOW_REST.alpha + (GLOW_PEAK.alpha - GLOW_REST.alpha) * t;
  return `0 0 ${blur.toFixed(1)}px ${spread.toFixed(1)}px rgba(192, 192, 192, ${alpha.toFixed(3)})`;
}
