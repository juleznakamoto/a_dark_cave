import { useEffect, useState } from "react";

/**
 * One WebGL progress shader exists at a time (Estate ↔ Bastion in-game).
 * `/dev/animations` mounts several hosts, so only the section nearest the
 * top of the viewport may hold it. Hash is a fallback before IO fires.
 */

type SectionRecord = { inView: boolean };

const registry = new Map<string, SectionRecord>();
const listeners = new Set<(winner: string | null) => void>();
let winner: string | null = null;

export function pickDemoShaderWinner(
  sections: { id: string; inView: boolean; top: number }[],
  hashId = "",
): string | null {
  let bestId: string | null = null;
  let bestScore = Infinity;
  for (const section of sections) {
    if (!section.inView) continue;
    const score = section.top < 0 ? -section.top + 1000 : section.top;
    if (score < bestScore) {
      bestScore = score;
      bestId = section.id;
    }
  }
  if (bestId) return bestId;
  if (hashId && sections.some((section) => section.id === hashId)) {
    return hashId;
  }
  return null;
}

function currentHashId(): string {
  return window.location.hash.replace(/^#/, "");
}

function snapshot(): { id: string; inView: boolean; top: number }[] {
  const out: { id: string; inView: boolean; top: number }[] = [];
  for (const [id, record] of registry) {
    const el = document.getElementById(id);
    out.push({
      id,
      inView: record.inView,
      top: el?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    });
  }
  return out;
}

function recompute() {
  const next = pickDemoShaderWinner(snapshot(), currentHashId());
  if (winner === next) return;
  winner = next;
  listeners.forEach((fn) => fn(winner));
}

export function useDemoShaderVisible(sectionId: string): boolean {
  const [active, setActive] = useState(() => currentHashId() === sectionId);

  useEffect(() => {
    registry.set(sectionId, { inView: false });
    const onWinner = (id: string | null) => setActive(id === sectionId);
    listeners.add(onWinner);

    const el = document.getElementById(sectionId);
    const scrollRoot =
      el?.closest("[data-radix-scroll-area-viewport]") ?? null;
    const io =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
          ([entry]) => {
            const record = registry.get(sectionId);
            if (!record) return;
            record.inView = entry.isIntersecting;
            recompute();
          },
          {
            root: scrollRoot instanceof Element ? scrollRoot : null,
            threshold: 0.15,
          },
        )
        : null;
    if (el && io) io.observe(el);

    const onHash = () => recompute();
    const onScroll = () => recompute();
    window.addEventListener("hashchange", onHash);
    const scrollTarget =
      scrollRoot instanceof Element ? scrollRoot : window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    recompute();

    return () => {
      io?.disconnect();
      window.removeEventListener("hashchange", onHash);
      scrollTarget.removeEventListener("scroll", onScroll);
      registry.delete(sectionId);
      listeners.delete(onWinner);
      recompute();
    };
  }, [sectionId]);

  return active;
}
