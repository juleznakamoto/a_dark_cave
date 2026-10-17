import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { VILLAGE_SILVER_COIN_RADIUS } from "@/game/villageMapSilver";

/** On the short stacked map a map-unit coin shrinks to a speck. Keep a small disc. */
const MIN_RADIUS_PX = 9.6;

/**
 * Same fisheye as the sidebar silver row (`ResourceCoinIcon`), sized to the coin.
 * Noto's glyph sits inside the em box, so the em is a little larger than the disc.
 */
const GLYPH = "\u25C9";
const GLYPH_EM = VILLAGE_SILVER_COIN_RADIUS * 2.35;
/** Outer ink of the fisheye, centered on the same point as the glyph. */
const OUTER_R = GLYPH_EM * 0.345;

/**
 * A silver coin on open village ground. The wide transparent circle is the tap target.
 */
export function SilverCoinMark({
  id,
  x,
  y,
  label,
  onCollect,
}: {
  id: string;
  x: number;
  y: number;
  label: string;
  onCollect?: (id: string) => void;
}) {
  const radius = VILLAGE_SILVER_COIN_RADIUS;
  const markId = useId().replace(/:/g, "");
  const shadowId = `silver-coin-shadow-${markId}`;
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
      const next = radiusPx > 0 ? Math.max(1, MIN_RADIUS_PX / radiusPx) : 1;
      setBoost((prev) => (Math.abs(prev - next) < 0.05 ? prev : next));
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
      transform={`translate(${x} ${y}) scale(${boost})`}
      role="button"
      aria-label={label}
      onPointerDown={onPointerDown}
    >
      <title>{label}</title>
      <defs>
        <filter
          id={shadowId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="blur" />
          <feComposite in="blur" in2="SourceAlpha" operator="out" result="outside" />
          <feFlood floodColor="#000" floodOpacity="0.85" result="ink" />
          <feComposite in="ink" in2="outside" operator="in" />
        </filter>
      </defs>
      <circle r={radius + 4} fill="#000" fillOpacity={0} />
      <circle
        className="village-silver-coin-shadow"
        r={OUTER_R}
        fill="#000"
        filter={`url(#${shadowId})`}
        pointerEvents="none"
      />
      <text
        className="village-silver-coin-glyph text-gray-400"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={GLYPH_EM}
        fill="currentColor"
        pointerEvents="none"
      >
        {GLYPH}
      </text>
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
