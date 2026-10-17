import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { VILLAGE_SILVER_COIN_RADIUS } from "@/game/villageMapSilver";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";

/** On the short stacked map a map-unit coin shrinks to a speck. Keep a small disc. */
const MIN_RADIUS_PX = 9.6;

/**
 * Same fisheye as the sidebar silver row (`ResourceCoinIcon`), sized to the coin.
 * `dominant-baseline: central` pins the em-box center. Noto draws the disc above
 * that, and hinting moves it as the map scales, so the shadow and hover follow
 * the painted ink.
 */
const GLYPH = "\u25C9";
const GLYPH_FONT = '"Noto Symbol Compat", "Noto Sans Symbols 2", sans-serif';
const GLYPH_EM = VILLAGE_SILVER_COIN_RADIUS * 2.35;
/** First paint, before the screen size is measured. Noto at a large size. */
const GLYPH_DY_EM = 0.14;
const OUTER_R_EM = 0.396;

type FisheyePlace = { dy: number; radius: number };

const FALLBACK_PLACE: FisheyePlace = {
  dy: GLYPH_EM * GLYPH_DY_EM,
  radius: GLYPH_EM * OUTER_R_EM,
};

let measureCtx: CanvasRenderingContext2D | null = null;

/** Map-unit nudge and outer radius so the halo shares the painted disc's center. */
function fisheyePlace(fontSizePx: number): FisheyePlace {
  if (!fontSizePx || fontSizePx < 4) return FALLBACK_PLACE;
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return FALLBACK_PLACE;
  measureCtx.font = `400 ${fontSizePx}px ${GLYPH_FONT}`;
  const box = measureCtx.measureText(GLYPH);
  const fontMid = (box.fontBoundingBoxAscent - box.fontBoundingBoxDescent) / 2;
  const inkMid = (box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2;
  const radiusPx = (box.actualBoundingBoxAscent + box.actualBoundingBoxDescent) / 2;
  if (!Number.isFinite(fontMid) || !radiusPx) return FALLBACK_PLACE;
  return {
    dy: ((inkMid - fontMid) / fontSizePx) * GLYPH_EM,
    radius: (radiusPx / fontSizePx) * GLYPH_EM,
  };
}

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
  const [place, setPlace] = useState<FisheyePlace>(FALLBACK_PLACE);
  useLayoutEffect(() => {
    mountNotoSansSymbols2FontFace();
    const svg = groupRef.current?.ownerSVGElement;
    if (!svg) return;
    const update = () => {
      const ctm = svg.getScreenCTM();
      const pxPerUnit = ctm ? Math.hypot(ctm.a, ctm.b) : 0;
      if (!pxPerUnit) return;
      const radiusPx = radius * pxPerUnit;
      const nextBoost = radiusPx > 0 ? Math.max(1, MIN_RADIUS_PX / radiusPx) : 1;
      const nextPlace = fisheyePlace(GLYPH_EM * nextBoost * pxPerUnit);
      setBoost((prev) => (Math.abs(prev - nextBoost) < 0.05 ? prev : nextBoost));
      setPlace((prev) =>
        Math.abs(prev.dy - nextPlace.dy) < 0.05 &&
        Math.abs(prev.radius - nextPlace.radius) < 0.05
          ? prev
          : nextPlace,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    document.fonts?.addEventListener("loadingdone", update);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", update);
    };
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
        r={place.radius}
        fill="#000"
        filter={`url(#${shadowId})`}
        pointerEvents="none"
      />
      <text
        className="village-silver-coin-glyph text-gray-400"
        y={place.dy}
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
        r={place.radius}
        fill="none"
        stroke="#000"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    </g>
  );
}
