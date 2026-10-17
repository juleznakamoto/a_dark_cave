import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { VILLAGE_SILVER_COIN_RADIUS, type VillageMapCoinMetal } from "@/game/villageMapSilver";

/** On the short stacked map a map-unit coin shrinks to a speck. Keep a small disc. */
const MIN_RADIUS_PX = 9.6;

/**
 * Same painted size as the Noto Sans Symbols 2 fisheye (U+25C9) this mark used
 * to draw at `coin radius * 2.35`. Measured at 400px: outer radius 158.5,
 * ring stroke 28, inner disc radius 111.5.
 */
const GLYPH_EM = VILLAGE_SILVER_COIN_RADIUS * 2.35;
const OUTER_R = GLYPH_EM * (158.5 / 400);
const RING_STROKE = GLYPH_EM * (28 / 400);
const RING_R = OUTER_R - RING_STROKE / 2;
const INNER_R = GLYPH_EM * (111.5 / 400);

/**
 * A silver or gold coin on open village ground. The wide transparent circle is the tap target.
 * Gold uses the same yellow as the sidebar gold row.
 */
export function SilverCoinMark({
  id,
  x,
  y,
  label,
  metal = "silver",
  onCollect,
}: {
  id: string;
  x: number;
  y: number;
  label: string;
  metal?: VillageMapCoinMetal;
  onCollect?: (id: string) => void;
}) {
  const radius = VILLAGE_SILVER_COIN_RADIUS;
  const groupRef = useRef<SVGGElement>(null);
  const [boost, setBoost] = useState(1);
  useLayoutEffect(() => {
    const svg = groupRef.current?.ownerSVGElement;
    if (!svg) return;
    const update = () => {
      const ctm = svg.getScreenCTM();
      const pxPerUnit = ctm ? Math.hypot(ctm.a, ctm.b) : 0;
      if (!pxPerUnit) return;
      const radiusPx = radius * pxPerUnit;
      const nextBoost = radiusPx > 0 ? Math.max(1, MIN_RADIUS_PX / radiusPx) : 1;
      setBoost((prev) => (Math.abs(prev - nextBoost) < 0.05 ? prev : nextBoost));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [radius]);
  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onCollect?.(id);
  };
  return (
    <g
      ref={groupRef}
      className="village-silver-coin"
      data-testid="village-silver-coin"
      data-coin-id={id}
      data-coin-metal={metal}
      transform={`translate(${x} ${y}) scale(${boost})`}
      role="button"
      aria-label={label}
      onPointerDown={onPointerDown}
    >
      <circle r={radius + 4} fill="#000" fillOpacity={0} />
      <g className={metal === "gold" ? "text-yellow-600" : "text-gray-400"} pointerEvents="none">
        <circle r={RING_R} fill="none" stroke="currentColor" strokeWidth={RING_STROKE} />
        <circle r={INNER_R} fill="currentColor" />
      </g>
      <circle
        className="village-silver-coin-hover"
        r={OUTER_R}
        fill="none"
        stroke="#000"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    </g>
  );
}
