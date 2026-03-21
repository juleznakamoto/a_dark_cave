import { useLayoutEffect, useState, useCallback } from "react";
import { useGameStore } from "@/game/state";

const LABELS: Record<string, string> = {
  pause: "Resume game",
  music: "Toggle music",
  sfx: "Toggle sounds",
  trader: "Open shop",
  fullgame: "Unlock full game",
  donate: "Support the dev",
  community: "Community & legal",
  profile: "Account & saves",
  login: "Sign in",
  leaderboard: "Rankings",
  discovery: "Discover games",
};

interface AnchorRect {
  key: string;
  label: string;
  rect: DOMRect;
}

type LabelPlacement = {
  key: string;
  label: string;
  lx: number;
  ly: number;
  tx: number;
  ty: number;
};

export default function PauseChromeHelpOverlay() {
  const isPaused = useGameStore((s) => s.isPaused);
  const [placements, setPlacements] = useState<LabelPlacement[]>([]);

  const measure = useCallback(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-pause-help]");
    const anchors: AnchorRect[] = [];

    els.forEach((el) => {
      const key = el.getAttribute("data-pause-help");
      if (!key || !LABELS[key]) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      anchors.push({ key, label: LABELS[key], rect });
    });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const results: LabelPlacement[] = [];

    for (const { key, label, rect } of anchors) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const isBottom = cy > vh * 0.5;
      const isRight = cx > vw * 0.5;

      let lx: number;
      let ly: number;

      if (isBottom) {
        // Footer elements: place label above the target
        ly = rect.top - 40;
        lx = Math.max(8, Math.min(cx, vw - 100));
      } else if (isRight) {
        // Profile-area elements (top-right): place label to the left
        lx = rect.left - 110;
        ly = cy - 8;
      } else {
        ly = rect.bottom + 24;
        lx = cx;
      }

      results.push({ key, label, lx, ly, tx: cx, ty: isBottom ? rect.top : cy });
    }

    setPlacements(results);
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
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {placements.map(({ key, lx, ly, tx, ty }) => (
          <line
            key={key}
            x1={lx}
            y1={ly + 8}
            x2={tx}
            y2={ty}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}
      </svg>
      {placements.map(({ key, label, lx, ly }) => (
        <div
          key={key}
          className="absolute text-[11px] text-neutral-300 bg-neutral-900/80 border border-neutral-700/60 rounded px-1.5 py-0.5 whitespace-nowrap"
          style={{
            left: lx,
            top: ly,
            transform: "translate(-50%, 0)",
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
