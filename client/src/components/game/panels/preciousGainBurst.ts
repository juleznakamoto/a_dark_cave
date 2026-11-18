import { useEffect, useRef, useState } from "react";

export type ResourceGainRow = {
  id: string;
  value: number;
};

/**
 * Nonce per resource row. Bumps when that amount rises, or when the row
 * appears after the first snapshot. The first snapshot is the loaded save,
 * so opening the game does not spark every icon.
 */
export function useResourceGainBurstNonce(
  rows: readonly ResourceGainRow[],
): Readonly<Record<string, number>> {
  const previousRef = useRef<Map<string, number> | null>(null);
  const [nonceById, setNonceById] = useState<Record<string, number>>({});

  useEffect(() => {
    const next = new Map(rows.map((row) => [row.id, row.value]));
    const previous = previousRef.current;
    previousRef.current = next;
    if (!previous) return;

    const increased: string[] = [];
    for (const [id, value] of next) {
      const before = previous.get(id);
      if (before === undefined || value > before) increased.push(id);
    }
    if (increased.length === 0) return;

    setNonceById((current) => {
      const updated = { ...current };
      for (const id of increased) updated[id] = (updated[id] ?? 0) + 1;
      return updated;
    });
  }, [rows]);

  return nonceById;
}
