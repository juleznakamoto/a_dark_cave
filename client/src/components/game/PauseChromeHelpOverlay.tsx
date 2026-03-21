import { useLayoutEffect, useState, useCallback } from "react";
import { useGameStore } from "@/game/state";

const LABELS: Record<string, string> = {
  pause: "Resume game",
  music: "Toggle music",
  sfx: "Toggle sounds",
  trader: "Open shop",
  fullgame: "Unlock full game",
  donate: "Support the dev",
  reddit: "Reddit",
  wiki: "Wiki",
  instagram: "Instagram",
  incrementaldb: "Game database",
  contact: "Contact",
  profile: "Account & saves",
  login: "Sign in",
  leaderboard: "Rankings",
  discovery: "Discover games",
};

type LabelPlacement = {
  key: string;
  label: string;
  lx: number;
  ly: number;
  tx: number;
  ty: number;
  region: "footer" | "profile";
};

const LABEL_H = 20;
const LABEL_GAP = 4;

function estimateLabelWidth(text: string): number {
  return text.length * 6.5 + 16;
}

function resolveOverlaps(items: LabelPlacement[]): LabelPlacement[] {
  const sorted = [...items].sort((a, b) => a.lx - b.lx);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      const wi = estimateLabelWidth(sorted[i].label);
      const wj = estimateLabelWidth(sorted[j].label);
      const hOverlap =
        Math.abs(sorted[i].lx - sorted[j].lx) < (wi + wj) / 2 + LABEL_GAP;
      const vOverlap =
        Math.abs(sorted[i].ly - sorted[j].ly) < LABEL_H + LABEL_GAP;
      if (hOverlap && vOverlap) {
        sorted[i].ly = sorted[j].ly - LABEL_H - LABEL_GAP;
      }
    }
  }

  return sorted;
}

function resolveProfileOverlaps(items: LabelPlacement[]): LabelPlacement[] {
  const sorted = [...items].sort((a, b) => a.ly - b.ly);

  for (let i = 0; i < sorted.length; i++) {
    const wi = estimateLabelWidth(sorted[i].label);
    sorted[i].lx = sorted[i].tx - wi / 2 - 8;

    for (let j = 0; j < i; j++) {
      const vOverlap =
        Math.abs(sorted[i].ly - sorted[j].ly) < LABEL_H + LABEL_GAP;
      if (vOverlap) {
        sorted[i].ly = sorted[j].ly + LABEL_H + LABEL_GAP;
      }
    }
  }

  return sorted;
}

function isElementVisible(el: HTMLElement): boolean {
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

export default function PauseChromeHelpOverlay() {
  const isPaused = useGameStore((s) => s.isPaused);
  const [placements, setPlacements] = useState<LabelPlacement[]>([]);

  const measure = useCallback(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-pause-help]");
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const footerItems: LabelPlacement[] = [];
    const profileItems: LabelPlacement[] = [];

    els.forEach((el) => {
      const key = el.getAttribute("data-pause-help");
      if (!key || !LABELS[key]) return;
      if (!isElementVisible(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const isBottom = cy > vh * 0.5;
      const isRight = cx > vw * 0.5;

      if (isBottom) {
        footerItems.push({
          key,
          label: LABELS[key],
          lx: Math.max(8, Math.min(cx, vw - 8)),
          ly: rect.top - 32,
          tx: cx,
          ty: rect.top,
          region: "footer",
        });
      } else if (isRight) {
        profileItems.push({
          key,
          label: LABELS[key],
          lx: rect.left - 8,
          ly: cy - 8,
          tx: rect.left,
          ty: cy,
          region: "profile",
        });
      }
    });

    const resolvedFooter = resolveOverlaps(footerItems);
    const resolvedProfile = resolveProfileOverlaps(profileItems);
    setPlacements([...resolvedFooter, ...resolvedProfile]);
  }, []);

  useLayoutEffect(() => {
    if (!isPaused) {
      setPlacements([]);
      return;
    }

    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [isPaused, measure]);

  if (!isPaused || placements.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overlay-fade-in"
      style={{ zIndex: 55 }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {placements.map(({ key, label, lx, ly, tx, ty, region }) => {
          const x1 =
            region === "profile" ? lx + estimateLabelWidth(label) / 2 : lx;
          const y1 = region === "profile" ? ly + LABEL_H / 2 : ly + LABEL_H;
          return (
            <line
              key={key}
              x1={x1}
              y1={y1}
              x2={tx}
              y2={ty}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          );
        })}
      </svg>
      {placements.map(({ key, label, lx, ly }) => (
        <div
          key={key}
          className="absolute text-[11px] text-neutral-300 bg-neutral-900/80 border border-neutral-700/60 rounded px-1.5 py-0.5 whitespace-nowrap"
          style={{ left: lx, top: ly, transform: "translate(-50%, 0)" }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
