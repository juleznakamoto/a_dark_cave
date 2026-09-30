import { cloneElement, createContext, isValidElement, memo, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { heartfireHatchOpacity } from "@/game/villageMapBuild";
import { VILLAGE_MAP_OPEN_FADE_DELAY_MS, type VillageMapReveal } from "@/game/villageMapReveal";
import { BUILDINGS, MAP_CENTER, treeDrawScale, type BuildState, type MapTree, type SanctumGod, type Tuning } from "@/pages/village-map-demo/catalog";
import { TreeMark } from "@/pages/village-map-demo/TreeMark";
import { treeReach, treeVariant } from "@/pages/village-map-demo/trees";
import {
  ringPoints,
  villageGroundPoints,
  furthestVillageGround,
  pointInPolygon,
  treeMeetsTrap,
  treeMeetsMoat,
  outsetFromCenter,
  smoothClosedPath,
  trapPoints,
  trapAreaLevel,
  trapWallOutset,
  trapsClearOfBuildings,
  layoutWallRadius,
  palisadeTowers,
  circleMeetsPalisade,
  circleMeetsBuilding,
  buildingReach,
  wallPolygon,
  wallStrokeWidth,
  moatCenterRadius,
  moatRingPoints,
  moatBandEdges,
  MOAT_STROKE,
  moatOuterOffsetMax,
  TRAP_DRAW_SCALE,
  trapArmLength,
  trapHitRadius,
  trapMarkReach,
  trapMarkScale,
  mapFramePoints,
  fittedViewBox,
  snapToPixel,
  WALL_CHITIN_STROKE,
  CHITIN_OUTLINE,
  CHITIN_SPIKE_LENGTH,
  PALISADE_BORDER,
  pitOutline,
  pitScale,
  pitContourScales,
  storageBorder,
  storageScale,
  storageTowers,
  blacksmithAnnex,
  blacksmithFurnace,
  blacksmithOutline,
  blacksmithScale,
  cabinOutline,
  cabinTower,
  tanneryOutline,
  tradeOutline,
  tradeCircles,
  altarOutline,
  altarSpan,
  sanctumCircles,
  heartfireBorderTriangles,
  herbGardenBeds,
  templeKnightCross,
  templeKnightCrossRays,
  alchemistHall,
  clerksHut,
  archiveOutline,
  buildersOutline,
  buildersHole,
  buildersWing,
  foundryFurnacePlates,
  foundryOutline,
  coinhouseLayout,
  placedSlots,
  containSlots,
  constrainMove,
  staysPut,
  buildingHutSize,
  markSize,
  watchtowerOutline,
  watchtowerWidth,
  watchtowerLevelScale,
  tentOutline,
  crossOutline,
  ESTATE_BORDER,
  BASTION_LENGTH,
  BASTION_DEPTH,
  bastionOutlineWidth,
  LONGHOUSE_LENGTH,
  longhouseOutline,
  boneyardOutline,
  quarryOutline,
  timberMillOutline,
  pillarOutline,
  boneTempleOutline,
  boneTempleSpikedCorners,
  HUT_LENGTH,
  radialAngle,
  bastionTowers,
  estateOutline,
  wizardTowerOutline,
  wallChitinPolygon,
  wallChitinOpenPaths,
  wallChitinOpenChains,
  chitinSpikesAlongPolyline,
  palisadeTowerRim,
  palisadeTowerChitinOutset,
  polyOutsideChitinPaths,
  polyOutsideChitinChains,
  PALISADE_TOWER_STROKE,
  bastionChitinPaths,
  bastionChitinChains,
  bastionDrawbridge,
  drawbridgeChitinGap,
  type BastionDrawbridge,
  watchtowerChitinPaths,
  watchtowerChitinChains,
  type PlacedSlot,
  type Point,
  type ChitinSpike,
  type ChitinBlocker,
  type WallChitinSpan,
} from "@/pages/village-map-demo/geometry";
import {
  buildVillagePathField,
  constrainVillagePath,
  pathMeetsCircle,
  villagePathDrawings,
  type PathFade,
  type VillagePath,
} from "@/pages/village-map-demo/pathways";

export type MarkTuning = Pick<Tuning, "fill" | "ink" | "fire">;

/** Extra stroke so a highlight grows 1px into the building and 1px past the border. */
export const MAP_HIGHLIGHT_BORDER = 2;
export const MapBorderExtraContext = createContext(0);
/** Reveal fade: the extra outline stays thick, then eases off over the last second. */
export const MapHighlightFadeContext = createContext(false);
export const MapInkContext = createContext("#000000");
/**
 * The interactive map always draws the hover ring, hidden until a class shows it.
 * Icons leave this off, so they do not carry a second copy of every shape.
 */
export const MapHoverRingContext = createContext(false);

function useMapBorderExtra(): number {
  return useContext(MapBorderExtraContext);
}

export function useMapInk(): string {
  return useContext(MapInkContext);
}

export function useOutlineRing(stroke: number, strokeLinejoin: "miter" | "round" = "miter") {
  const ink = useMapInk();
  return {
    fill: "none" as const,
    stroke: ink,
    strokeWidth: stroke,
    strokeLinejoin,
  };
}

/** A second copy of the fill tree, so the highlight can rasterize it on its own. */
function cloneMark(node: ReactNode, prefix: string): ReactNode {
  if (node == null || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((child, index) => cloneMark(child, `${prefix}-${index}`));
  if (!isValidElement(node)) return node;
  const props = node.props as { children?: ReactNode };
  return cloneElement(
    node,
    { key: `${prefix}-${String(node.key ?? "n")}` },
    props.children != null ? cloneMark(props.children, prefix) : props.children,
  );
}

/** A colored ring from these shapes. Children must leave the ring mask in `ring`. */
function SilhouetteRing({
  id,
  color,
  className,
  source,
  children,
}: {
  id: string;
  color: string;
  className?: string;
  source: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <defs>
        <filter
          id={id}
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          x="-0.6"
          y="-0.6"
          width="2.2"
          height="2.2"
          colorInterpolationFilters="sRGB"
        >
          {children}
          <feFlood floodColor={color} result="ink" />
          <feComposite in="ink" in2="ring" operator="in" />
        </filter>
      </defs>
      <g className={className} filter={`url(#${id})`} style={{ pointerEvents: "none" }}>
        {cloneMark(source, id)}
      </g>
    </>
  );
}

/**
 * Black ring around the union of these fills: 1px into the shape and 1px past
 * its existing outline. Inner strokes are not part of the union, so they stay thin.
 */
export function SilhouetteHighlight({
  stroke,
  color = "#000",
  hugsEdge = false,
  outsideOnly = false,
  children,
}: {
  stroke: number;
  color?: string;
  /**
   * Children are already the outer ink (the heartfire teeth). The ring only
   * adds the highlight extra, instead of growing by the whole border again.
   */
  hugsEdge?: boolean;
  /** Add the outside pixel only. The children are already the drawn stroke. */
  outsideOnly?: boolean;
  children: ReactNode;
}) {
  const extra = useMapBorderExtra();
  const fadeHighlight = useContext(MapHighlightFadeContext);
  const hoverRing = useContext(MapHoverRingContext);
  const id = `map-hl-${useId().replace(/:/g, "")}`;
  const ringExtra = hoverRing && !fadeHighlight ? MAP_HIGHLIGHT_BORDER : extra;
  if (ringExtra <= 0) return null;
  const outside = ringExtra / 2;
  const grow = hugsEdge || outsideOnly ? outside : stroke + outside;
  const shrink = outsideOnly ? 0 : outside;
  const fadeClass = fadeHighlight ? "village-map-highlight-fade" : undefined;
  // The fade class has to sit on the filtered element. A filter inside the opacity group does not paint.
  const ring = (
    <SilhouetteRing id={id} color={color} className={fadeClass} source={children}>
      <feMorphology in="SourceAlpha" operator="dilate" radius={grow} result="grown" />
      {shrink > 0 ? (
        <feMorphology in="SourceAlpha" operator="erode" radius={shrink} result="shrunk" />
      ) : null}
      <feComposite in="grown" in2={shrink > 0 ? "shrunk" : "SourceAlpha"} operator="out" result="ring" />
    </SilhouetteRing>
  );
  if (fadeHighlight) return ring;
  if (!hoverRing) return ring;
  return <g className="village-map-hover-ring">{ring}</g>;
}

/** Strokes sit under the fills, so seams inside the building stay covered. The highlight rings the outer silhouette only. */
export function BorderStack({
  rings,
  fills,
  outline,
  stroke = 1,
  outsideOnly = false,
}: {
  rings: ReactNode;
  fills: ReactNode;
  /** Fills that form the outer silhouette. Defaults to every fill. */
  outline?: ReactNode;
  stroke?: number;
  /** Add 1px outside the painted border. The ring does not step into the fill. */
  outsideOnly?: boolean;
}) {
  // The ring needs the fills too, or the hole inside a stroke grows inward.
  const highlight = outsideOnly ? <>{rings}{fills}</> : (outline ?? fills);
  return (
    <g>
      {rings}
      {fills}
      <SilhouetteHighlight stroke={stroke} outsideOnly={outsideOnly}>
        {highlight}
      </SilhouetteHighlight>
    </g>
  );
}

export type Footprint =
  | "square"
  | "hut"
  | "longhouse"
  | "tent"
  | "round"
  | "wizard"
  | "rounded"
  | "pit"
  | "cross"
  | "bastion"
  | "estate"
  | "watchtower";

/** Gap between 45° hatch lines, in map units. */
const HATCH_GAP = 6;
export const HATCH_WIDTH = 1.7;
/** Pillar, monolith, and pale cross. Half the moat stripe width. */
export const CROSSED_HATCH_WIDTH = HATCH_WIDTH * 0.5;
/** Hand-drawn edge for buildings, chitin, towers, and traps. */
export const OUTLINE_WOBBLE = "url(#building-outline-wobble)";
/**
 * Village paper edge. The palisade does not use this.
 * Frequency: higher is a shorter bend. Scale: how far the outer edge bulges, in map units.
 */
const VILLAGE_OUTLINE_FREQUENCY = 1.16;
const VILLAGE_OUTLINE_SCALE = 20.1 * 1.15;
const VILLAGE_OUTLINE_SEED = 4;
export const VILLAGE_OUTLINE_WOBBLE = "url(#village-outline-wobble)";
/** Moat stripes. Coarser, so a long stroke still reads as a little bent. */
export const VILLAGE_STROKE_WOBBLE = "url(#village-stroke-wobble)";

const WOBBLE_CHANNELS = ["R", "G", "B"] as const;
/** Displacement amount for the wall, moat, and traps. */
const WOBBLE_SCALE = 1.15;
/** Building outlines sit 15% past that. */
const BUILDING_WOBBLE_SCALE = WOBBLE_SCALE * 1.15;

/** Each building key gets its own seed, so identical shapes do not bend the same way. */
function wobbleParams(key: string): {
  seed: number;
  frequency: number;
  scale: number;
  xChannel: "R" | "G" | "B";
  yChannel: "R" | "G" | "B";
} {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const mixed = hash >>> 0;
  const xIndex = mixed % 3;
  const yIndex = (xIndex + 1 + ((mixed >>> 3) % 2)) % 3;
  return {
    seed: 1 + (mixed % 89),
    frequency: 0.11 + ((mixed >>> 7) % 14) * 0.01,
    scale: (1.6 + ((mixed >>> 15) % 13) * 0.1) * BUILDING_WOBBLE_SCALE,
    xChannel: WOBBLE_CHANNELS[xIndex],
    yChannel: WOBBLE_CHANNELS[yIndex],
  };
}

export function wobbleFilterId(key: string): string {
  return `outline-wobble-${key.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function buildingWobbleKeys(): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const building of BUILDINGS) {
    const count = Math.max(building.slots.length, building.names.length);
    for (let index = 0; index < count; index++) {
      const key = `${building.id}:${index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function WobbleFilter({
  id,
  seed,
  frequency,
  scale,
  xChannel,
  yChannel,
  outsideOnly = false,
}: {
  id: string;
  seed: number;
  frequency: number;
  scale: number;
  xChannel: "R" | "G" | "B";
  yChannel: "R" | "G" | "B";
  /** Keep the original shape on top, so the edge only bulges outward. */
  outsideOnly?: boolean;
}) {
  return (
    <filter
      id={id}
      filterUnits="objectBoundingBox"
      primitiveUnits="userSpaceOnUse"
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
      colorInterpolationFilters="sRGB"
    >
      <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={1} seed={seed} result="noise" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={scale}
        xChannelSelector={xChannel}
        yChannelSelector={yChannel}
        result={outsideOnly ? "wobbled" : undefined}
      />
      {outsideOnly ? <feComposite in="SourceGraphic" in2="wobbled" operator="over" /> : null}
    </filter>
  );
}

export function OutlineWobbleFilter() {
  return (
    <>
      <WobbleFilter id="building-outline-wobble" seed={4} frequency={0.16} scale={2.1 * WOBBLE_SCALE} xChannel="R" yChannel="G" />
      <WobbleFilter
        id="village-outline-wobble"
        seed={VILLAGE_OUTLINE_SEED}
        frequency={VILLAGE_OUTLINE_FREQUENCY}
        scale={VILLAGE_OUTLINE_SCALE}
        xChannel="R"
        yChannel="G"
        outsideOnly
      />
      <WobbleFilter id="village-stroke-wobble" seed={9} frequency={0.05} scale={4.5} xChannel="R" yChannel="B" />
      {buildingWobbleKeys().map((key) => {
        const wobble = wobbleParams(key);
        return <WobbleFilter key={key} id={wobbleFilterId(key)} {...wobble} />;
      })}
    </>
  );
}

/** Shared bend of every hatch stripe, a quarter quieter than the original 0.55. */
const HATCH_AMP = 0.55 * 0.75;
const HATCH_WAVE = 26;

/** Same irregular bend the moat stripes use. */
function hatchWobble(t: number, normal: number): number {
  return (
    HATCH_AMP * Math.sin((t / HATCH_WAVE) * Math.PI * 2 + normal * 0.21) +
    HATCH_AMP * 0.45 * Math.sin((t / (HATCH_WAVE * 0.37)) * Math.PI * 2 + normal * 1.3)
  );
}

const HATCH_DIR_X = Math.SQRT1_2;
const HATCH_DIR_Y = -Math.SQRT1_2;
const HATCH_N_X = Math.SQRT1_2;
const HATCH_N_Y = Math.SQRT1_2;

/** 45° stripes with an irregular wave, long enough to cross the moat band. */
export function moatHatchPaths(points: Point[], oval: number): string[] {
  let minR = Infinity;
  let maxR = 0;
  for (const point of points) {
    const dx = point.x - MAP_CENTER;
    const dy = (point.y - MAP_CENTER) / oval;
    const reach = Math.hypot(dx, dy);
    minR = Math.min(minR, reach);
    maxR = Math.max(maxR, reach);
  }
  const inner = minR - MOAT_STROKE / 2 - 10;
  const outer = maxR + moatOuterOffsetMax() + 10;
  const centerN = MAP_CENTER * HATCH_N_X + MAP_CENTER * HATCH_N_Y;
  const centerT = MAP_CENTER * HATCH_DIR_X + MAP_CENTER * HATCH_DIR_Y;
  const reach = outer + HATCH_AMP;
  const paths: string[] = [];
  for (let normal = centerN - reach; normal <= centerN + reach; normal += HATCH_GAP) {
    const along = Math.sqrt(Math.max(0, reach * reach - (normal - centerN) ** 2));
    let drawing = false;
    let d = "";
    for (let t = centerT - along; t <= centerT + along; t += 4) {
      const wobble = hatchWobble(t, normal);
      const x = HATCH_DIR_X * t + HATCH_N_X * (normal + wobble);
      const y = HATCH_DIR_Y * t + HATCH_N_Y * (normal + wobble);
      const dx = x - MAP_CENTER;
      const dy = (y - MAP_CENTER) / oval;
      const inside = Math.hypot(dx, dy) >= inner && Math.hypot(dx, dy) <= outer;
      if (!inside) {
        drawing = false;
        continue;
      }
      d += `${drawing ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      drawing = true;
    }
    if (d) paths.push(d);
  }
  return paths;
}

/** 45° stripes across a box around the origin, with the moat's wave. Clipped by the caller. */
export function localHatchPaths(reach: number): string[] {
  const span = reach + HATCH_GAP + 8;
  const paths: string[] = [];
  for (let normal = -span; normal <= span; normal += HATCH_GAP) {
    let d = "";
    for (let t = -span; t <= span; t += 4) {
      const wobble = hatchWobble(t, normal);
      const x = HATCH_DIR_X * t + HATCH_N_X * (normal + wobble);
      const y = HATCH_DIR_Y * t + HATCH_N_Y * (normal + wobble);
      d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths;
}

/**
 * The wall's hatch, in the bridge's local space.
 * Normals stay on the wall's grid, so a stripe that crosses the gate continues over the deck.
 */
export function bridgeHatchPaths(at: Point, bridge: BastionDrawbridge, phaseReach: number): string[] {
  const span = phaseReach + HATCH_GAP + 8;
  const theta = radialAngle(at) - Math.PI / 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const corners = [
    { x: -bridge.half, y: bridge.near },
    { x: bridge.half, y: bridge.near },
    { x: bridge.half, y: bridge.far },
    { x: -bridge.half, y: bridge.far },
  ].map((point) => ({
    x: at.x + point.x * cos - point.y * sin,
    y: at.y + point.x * sin + point.y * cos,
  }));
  let minN = Infinity;
  let maxN = -Infinity;
  let minT = Infinity;
  let maxT = -Infinity;
  for (const corner of corners) {
    const dx = corner.x - MAP_CENTER;
    const dy = corner.y - MAP_CENTER;
    minN = Math.min(minN, HATCH_N_X * dx + HATCH_N_Y * dy);
    maxN = Math.max(maxN, HATCH_N_X * dx + HATCH_N_Y * dy);
    minT = Math.min(minT, HATCH_DIR_X * dx + HATCH_DIR_Y * dy);
    maxT = Math.max(maxT, HATCH_DIR_X * dx + HATCH_DIR_Y * dy);
  }
  const pad = HATCH_AMP * 2 + 4;
  minN -= pad;
  maxN += pad;
  minT -= pad;
  maxT += pad;
  const first = Math.floor((minN + span) / HATCH_GAP);
  const last = Math.ceil((maxN + span) / HATCH_GAP);
  const t0 = -span + Math.floor((minT + span) / 4) * 4;
  const paths: string[] = [];
  for (let index = first; index <= last; index++) {
    const normal = -span + index * HATCH_GAP;
    let d = "";
    for (let t = t0; t <= maxT; t += 4) {
      const wobble = hatchWobble(t, normal);
      const mx = MAP_CENTER + HATCH_DIR_X * t + HATCH_N_X * (normal + wobble);
      const my = MAP_CENTER + HATCH_DIR_Y * t + HATCH_N_Y * (normal + wobble);
      const dx = mx - at.x;
      const dy = my - at.y;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      d += `${d ? "L" : "M"}${lx.toFixed(1)} ${ly.toFixed(1)}`;
    }
    if (d) paths.push(d);
  }
  return paths;
}

/** Moat-style stripes, clipped to a building. The outline is redrawn on top so the stroke stays sharp. */
export function HatchStripes({
  color,
  reach,
  clip,
  filter,
  strokeWidth = HATCH_WIDTH,
  strokeOpacity = 1,
  origin,
}: {
  color: string;
  reach: number;
  clip: ReactNode;
  /** Applied before the clip, so the wave stays inside the shape. */
  filter?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  /** Moves the stripes. The clip stays in the parent's coordinates. */
  origin?: Point;
}) {
  const id = `hatch-${useId().replace(/:/g, "")}`;
  const paths = localHatchPaths(reach);
  const stripes = (
    <g
      transform={origin ? `translate(${origin.x} ${origin.y})` : undefined}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={strokeOpacity}
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </g>
  );
  return (
    <>
      <defs>
        <clipPath id={id}>{clip}</clipPath>
      </defs>
      <g clipPath={`url(#${id})`} style={{ pointerEvents: "none" }}>
        {filter ? <g filter={filter}>{stripes}</g> : stripes}
      </g>
    </>
  );
}
