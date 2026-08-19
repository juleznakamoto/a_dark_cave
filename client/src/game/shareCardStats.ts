/** First wave is in play once the Bastion + Blast Gate unlock, or any wave was fought. */
export function hasReachedFirstAttackWaves(
  seen: Record<string, unknown> | undefined,
  bastionCount: number,
  postCompletionAttackWaveCount = 0,
): boolean {
  if ((Number(postCompletionAttackWaveCount) || 0) > 0) return true;
  if (
    seen?.firstWaveTriggered ||
    seen?.firstWaveVictory ||
    seen?.firstWaveDefeat
  ) {
    return true;
  }
  return Boolean(seen?.portalBlasted) && bastionCount > 0;
}
