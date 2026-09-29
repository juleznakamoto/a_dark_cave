import { cloneElement, createContext, isValidElement, memo, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { heartfireHatchOpacity } from "@/game/villageMapBuild";
import type { VillageMapReveal } from "@/game/villageMapReveal";
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

type MarkTuning = Pick<Tuning, "fill" | "ink" | "fire">;

/** Extra stroke so a highlight grows 1px into the building and 1px past the border. */
const MAP_HIGHLIGHT_BORDER = 2;
const MapBorderExtraContext = createContext(0);
/** Reveal fade: the extra outline stays thick, then eases off over the last second. */
const MapHighlightFadeContext = createContext(false);
const MapInkContext = createContext("#000000");
/**
 * The interactive map always draws the hover ring, hidden until a class shows it.
 * Icons leave this off, so they do not carry a second copy of every shape.
 */
const MapHoverRingContext = createContext(false);
/**
 * Fade masks are portaled here, outside the building's opacity animation.
 * A mask inside that animation is faded too, so the inner half of the stroke shows through.
 */
const MapMaskHostContext = createContext<SVGDefsElement | null>(null);
/** Mask stroke width. Half of this reaches past the fill and covers the stroke's soft inner edge. */
const FADE_STROKE_CUT = 1;

function useMapBorderExtra(): number {
  return useContext(MapBorderExtraContext);
}

function useMapInk(): string {
  return useContext(MapInkContext);
}

function useOutlineRing(stroke: number, strokeLinejoin: "miter" | "round" = "miter") {
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

/**
 * Same shapes as a stroke. A filter ring disappears under the fade-in opacity
 * animation, while a real stroke stays visible and can fade back to the normal border.
 */
function cloneMarkStroke(
  node: ReactNode,
  prefix: string,
  color: string,
  strokeWidth: number,
  addToStroke = false,
): ReactNode {
  if (node == null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map((child, index) =>
      cloneMarkStroke(child, `${prefix}-${index}`, color, strokeWidth, addToStroke),
    );
  }
  if (!isValidElement(node)) return node;
  const props = node.props as { children?: ReactNode; strokeWidth?: number };
  const paintable = typeof node.type === "string" && node.type !== "g" && node.type !== "defs";
  const existing = Number(props.strokeWidth);
  // A fill has no stroke to thicken. Skip it so the fade does not draw a new line on the inner edge.
  if (addToStroke && paintable && !Number.isFinite(existing)) return null;
  const width = addToStroke && Number.isFinite(existing) ? existing + strokeWidth : strokeWidth;
  return cloneElement(
    node,
    {
      key: `${prefix}-${String(node.key ?? "n")}`,
      ...(paintable
        ? { fill: "none", stroke: color, strokeWidth: width, strokeLinejoin: "miter" as const }
        : {}),
    },
    props.children != null
      ? cloneMarkStroke(props.children, prefix, color, strokeWidth, addToStroke)
      : props.children,
  );
}

/** Black copy of these shapes. The fade mask uses it to hide the stroke inside the building. */
function cloneMarkSolid(node: ReactNode, prefix: string): ReactNode {
  if (node == null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map((child, index) => cloneMarkSolid(child, `${prefix}-${index}`));
  }
  if (!isValidElement(node)) return node;
  const props = node.props as { children?: ReactNode };
  const paintable = typeof node.type === "string" && node.type !== "g" && node.type !== "defs";
  return cloneElement(
    node,
    {
      key: `${prefix}-${String(node.key ?? "n")}`,
      ...(paintable
        ? {
          fill: "#000",
          stroke: "#000",
          strokeWidth: FADE_STROKE_CUT,
          strokeLinejoin: "round" as const,
        }
        : {}),
    },
    props.children != null ? cloneMarkSolid(props.children, prefix) : props.children,
  );
}

/**
 * Black ring around the union of these fills: 1px into the shape and 1px past
 * its existing outline. Inner strokes are not part of the union, so they stay thin.
 */
function SilhouetteHighlight({
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
  const maskHost = useContext(MapMaskHostContext);
  const ringExtra = hoverRing && !fadeHighlight ? MAP_HIGHLIGHT_BORDER : extra;
  if (ringExtra <= 0) return null;
  const outside = ringExtra / 2;
  const grow = hugsEdge || outsideOnly ? outside : stroke + outside;
  const shrink = outsideOnly ? 0 : outside;
  // The fade-in group animates opacity. An SVG filter inside that group does not
  // paint, so the reveal uses a stroke of the same outer reach as the hover ring.
  // The stroke is centered on each shape, which would draw a line inside the
  // building and along every overlapping part. A mask of the union hides that.
  if (fadeHighlight) {
    const strokes = cloneMarkStroke(children, "hl", color, outsideOnly ? ringExtra : 2 * grow, outsideOnly);
    if (outsideOnly) {
      return (
        <g className="village-map-highlight-fade" style={{ pointerEvents: "none" }}>
          {strokes}
        </g>
      );
    }
    const maskId = `${id}-cut`;
    const reach = 4000;
    const mask = (
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        maskContentUnits="userSpaceOnUse"
        x={-reach}
        y={-reach}
        width={reach * 2}
        height={reach * 2}
      >
        <rect x={-reach} y={-reach} width={reach * 2} height={reach * 2} fill="#fff" />
        {cloneMarkSolid(children, "cut")}
      </mask>
    );
    const painted = (
      <g className="village-map-highlight-fade" mask={`url(#${maskId})`} style={{ pointerEvents: "none" }}>
        {strokes}
      </g>
    );
    if (maskHost) return <>{createPortal(mask, maskHost)}{painted}</>;
    return (
      <>
        {mask}
        {painted}
      </>
    );
  }
  const ring = (
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
          <feMorphology in="SourceAlpha" operator="dilate" radius={grow} result="grow" />
          {shrink > 0 ? (
            <feMorphology in="SourceAlpha" operator="erode" radius={shrink} result="shrink" />
          ) : null}
          <feComposite in="grow" in2={shrink > 0 ? "shrink" : "SourceAlpha"} operator="out" result="ring" />
          <feFlood floodColor={color} result="ink" />
          <feComposite in="ink" in2="ring" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} style={{ pointerEvents: "none" }}>
        {cloneMark(children, "hl")}
      </g>
    </>
  );
  if (!hoverRing) return ring;
  return <g className="village-map-hover-ring">{ring}</g>;
}

/** Strokes sit under the fills, so seams inside the building stay covered. The highlight rings the outer silhouette only. */
function BorderStack({
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
  const fadeHighlight = useContext(MapHighlightFadeContext);
  // The fade is a real stroke, so it thickens the border that is already drawn.
  // The hover ring is a filter, and it needs the fills too or the hole inside the stroke grows inward.
  const highlight = outsideOnly ? (fadeHighlight ? rings : <>{rings}{fills}</>) : (outline ?? fills);
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
const HATCH_WIDTH = 1.7;
/** Pillar, monolith, and pale cross. Half the moat stripe width. */
const CROSSED_HATCH_WIDTH = HATCH_WIDTH * 0.5;
/** Hand-drawn edge for buildings, chitin, towers, and traps. */
const OUTLINE_WOBBLE = "url(#building-outline-wobble)";
/**
 * Village paper edge. The palisade does not use this.
 * Frequency: higher is a shorter bend. Scale: how far the outer edge bulges, in map units.
 */
const VILLAGE_OUTLINE_FREQUENCY = 1.16;
const VILLAGE_OUTLINE_SCALE = 20.1 * 1.15;
const VILLAGE_OUTLINE_SEED = 4;
const VILLAGE_OUTLINE_WOBBLE = "url(#village-outline-wobble)";
/** Moat stripes. Coarser, so a long stroke still reads as a little bent. */
const VILLAGE_STROKE_WOBBLE = "url(#village-stroke-wobble)";

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

function wobbleFilterId(key: string): string {
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

function OutlineWobbleFilter() {
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
function moatHatchPaths(points: Point[], oval: number): string[] {
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
function localHatchPaths(reach: number): string[] {
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
function bridgeHatchPaths(at: Point, bridge: BastionDrawbridge, phaseReach: number): string[] {
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
function HatchStripes({
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

function HeartfireMark({
  size,
  fill,
  fire,
  level,
  ebonGrace = false,
}: {
  size: number;
  fill: string;
  fire: string;
  level: number;
  ebonGrace?: boolean;
}) {
  const border = ebonGrace ? 2 : 1;
  const ring = useOutlineRing(border);
  const radius = size / 2;
  const triangles = ebonGrace ? heartfireBorderTriangles(radius, border) : [];
  const teeth = triangles.map((triangle, index) => (
    <polygon key={index} points={formatPoints(triangle)} fill={EBON_GRACE} />
  ));
  return (
    <g>
      <circle r={radius} fill={fill} />
      <HatchStripes
        color={fire}
        reach={radius}
        clip={<circle r={radius} />}
        filter={outlineWobble("heartfire:0")}
        strokeOpacity={heartfireHatchOpacity(level)}
      />
      <circle
        r={radius + border / 2}
        {...ring}
        stroke={ebonGrace ? EBON_GRACE : ring.stroke}
      />
      {teeth}
      <SilhouetteHighlight stroke={border} hugsEdge={triangles.length > 0}>
        <circle r={triangles.length > 0 ? radius + border : radius} fill="#000" />
        {triangles.map((triangle, index) => (
          <polygon key={index} points={formatPoints(triangle)} fill="#000" />
        ))}
      </SilhouetteHighlight>
    </g>
  );
}

function outlineWobble(key: string): string {
  return `url(#${wobbleFilterId(key)})`;
}
const CHITIN_STROKE = WALL_CHITIN_STROKE;
/** Ebon Grace teeth and ring. Dark red, not the map ink. */
const EBON_GRACE = "#3a0c0c";
/** Brimstone furnace plates. */
const BRIMSTONE_INFUSION = "#5c2206";
/** Black line between the village paper and the palisade. Same weight as the outer edge. */
const VILLAGE_INK_GAP = PALISADE_BORDER;
/** Hair of room past the ink. The game chrome around the panel is the margin. */
const MAP_VIEW_PAD = 6;

function chitinPaint(color: string) {
  return {
    fill: "none" as const,
    stroke: color,
    strokeWidth: CHITIN_STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

/** Wider black stroke under the plate, so one map unit of ink shows on each edge. */
function ChitinRibbon({ d, color }: { d: string; color: string }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#000"
        strokeWidth={CHITIN_STROKE + CHITIN_OUTLINE * 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={d} {...chitinPaint(color)} />
    </g>
  );
}

function markRotation(buildingId: string, at: Point): string | undefined {
  if (
    buildingId === "heartfire" ||
    buildingId === "blackMonolith" ||
    buildingId === "wizardTower" ||
    buildingId === "paleCross"
  ) {
    return undefined;
  }
  const degrees = (radialAngle(at) * 180) / Math.PI;
  // Local -y is the front; rotate so that axis points at MAP_CENTER.
  // Estate and the builder buildings face the other way.
  const facing = degrees - 90 + (buildingId === "estate" || buildingId === "builders" ? 180 : 0);
  return `rotate(${facing})`;
}

function formatPoints(points: Point[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function buildingFootprint(buildingId: string): Footprint {
  return footprintOf(buildingId);
}

export function MapInkProvider({
  ink,
  children,
}: {
  ink: string;
  children: ReactNode;
}) {
  return <MapInkContext.Provider value={ink}>{children}</MapInkContext.Provider>;
}

function footprintOf(buildingId: string): Footprint {
  if (buildingId === "longhouse") return "longhouse";
  if (buildingId === "woodenHut" || buildingId === "stoneHut") return "hut";
  if (buildingId === "furTents") return "tent";
  if (buildingId === "wizardTower") return "wizard";
  if (
    buildingId === "heartfire" ||
    buildingId === "blackMonolith"
  ) {
    return "round";
  }
  if (buildingId === "pit") return "pit";
  if (buildingId === "paleCross") return "cross";
  if (buildingId === "bastion") return "bastion";
  if (buildingId === "watchtower") return "watchtower";
  if (buildingId === "estate") return "estate";
  if (buildingId === "herbGarden") return "rounded";
  return "square";
}

function offsetPolygon(points: Point[], delta: number): Point[] {
  if (delta === 0) return points;
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let reach = 0;
  for (const point of points) {
    reach = Math.max(reach, Math.hypot(point.x - cx, point.y - cy));
  }
  if (reach + delta <= 0) return points;
  const scale = (reach + delta) / reach;
  return points.map((point) => ({
    x: cx + (point.x - cx) * scale,
    y: cy + (point.y - cy) * scale,
  }));
}

function BuildingFootprint({
  size,
  shape,
  fill,
  strokeWidth,
  stroke,
  outwardBorder = true,
  level = 1,
}: {
  size: number;
  shape: Footprint;
  fill: string;
  strokeWidth: number;
  stroke?: string;
  outwardBorder?: boolean;
  level?: number;
}) {
  const ink = useMapInk();
  const line = stroke ?? ink;
  const ring = { fill: "none" as const, stroke: line, strokeWidth, strokeLinejoin: "miter" as const };
  const outset = outwardBorder ? strokeWidth / 2 : 0;
  if (shape === "tent") {
    const outline = tentOutline(size);
    const ringPoints = outwardBorder ? offsetPolygon(outline, outset) : outline;
    return (
      <BorderStack
        stroke={strokeWidth}
        rings={<polygon points={formatPoints(ringPoints)} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    );
  }
  if (shape === "watchtower") {
    const grown = size * watchtowerLevelScale(level);
    const outline = watchtowerOutline(grown, level);
    const ringPoints = outwardBorder ? offsetPolygon(outline, outset) : outline;
    return (
      <BorderStack
        stroke={strokeWidth}
        rings={<polygon points={formatPoints(ringPoints)} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    );
  }
  if (shape === "wizard") {
    const towerRadius = size / 2;
    const outline = wizardTowerOutline(towerRadius);
    const ringPoints = outwardBorder ? wizardTowerOutline(towerRadius + outset) : outline;
    return (
      <BorderStack
        stroke={strokeWidth}
        rings={<polygon points={formatPoints(ringPoints)} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    );
  }
  if (shape === "round") {
    return (
      <BorderStack
        stroke={strokeWidth}
        rings={<circle r={size / 2 + outset} {...ring} />}
        fills={<circle r={size / 2} fill={fill} />}
      />
    );
  }
  if (shape === "cross") {
    const outline = crossOutline(size);
    const ringPoints = outwardBorder ? offsetPolygon(outline, outset) : outline;
    return (
      <BorderStack
        stroke={strokeWidth}
        rings={<polygon points={formatPoints(ringPoints)} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    );
  }
  if (shape === "bastion") {
    const length = size * BASTION_LENGTH;
    const depth = size * BASTION_DEPTH;
    const towers = bastionTowers(size);
    const towerOutset = strokeWidth / 2;
    return (
      <g>
        <BorderStack
          stroke={strokeWidth}
          rings={
            <>
              <rect
                x={-length / 2 - towerOutset}
                y={-depth / 2 - towerOutset}
                width={length + strokeWidth}
                height={depth + strokeWidth}
                {...ring}
              />
              {towers.map((tower) => (
                <circle key={`ring-${tower.x}:${tower.y}`} cx={tower.x} cy={tower.y} r={tower.r + towerOutset} {...ring} />
              ))}
            </>
          }
          fills={
            <>
              <rect x={-length / 2} y={-depth / 2} width={length} height={depth} fill={fill} />
              {towers.map((tower) => (
                <circle key={`fill-${tower.x}:${tower.y}`} cx={tower.x} cy={tower.y} r={tower.r} fill={fill} />
              ))}
            </>
          }
        />
      </g>
    );
  }
  if (shape === "estate") {
    const outline = estateOutline(size, level);
    const ringPoints = outwardBorder ? offsetPolygon(outline, outset) : outline;
    return (
      <BorderStack
        stroke={strokeWidth}
        rings={<polygon points={formatPoints(ringPoints)} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    );
  }
  if (shape === "rounded") {
    const beds = herbGardenBeds(size);
    return (
      <g>
        {beds.map((bed, index) => (
          <BorderStack
            key={index}
            stroke={strokeWidth}
            rings={
              <rect
                x={bed.x - outset}
                y={bed.y - outset}
                width={bed.w + strokeWidth}
                height={bed.h + strokeWidth}
                rx={bed.r + outset}
                ry={bed.r + outset}
                {...ring}
              />
            }
            fills={
              <rect x={bed.x} y={bed.y} width={bed.w} height={bed.h} rx={bed.r} ry={bed.r} fill={fill} />
            }
          />
        ))}
      </g>
    );
  }
  const width = shape === "longhouse" ? size * LONGHOUSE_LENGTH : shape === "hut" ? size * HUT_LENGTH : size;
  return (
    <BorderStack
      stroke={strokeWidth}
      rings={
        <rect
          x={-width / 2 - outset}
          y={-size / 2 - outset}
          width={width + strokeWidth}
          height={size + strokeWidth}
          {...ring}
        />
      }
      fills={
        <rect x={-width / 2} y={-size / 2} width={width} height={size} fill={fill} />
      }
    />
  );
}

function StorageMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const body = size * storageScale(level);
  const stroke = storageBorder(level);
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  const towers = storageTowers(body, level);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <rect
              x={-body / 2 - outset}
              y={-body / 2 - outset}
              width={body + stroke}
              height={body + stroke}
              {...ring}
            />
            {towers.map((tower, index) => {
              if (tower.kind === "octagon") {
                return <polygon key={index} points={formatPoints(offsetPolygon(tower.points, outset))} {...ring} />;
              }
              return (
                <rect
                  key={index}
                  x={tower.x - tower.w / 2 - outset}
                  y={tower.y - tower.h / 2 - outset}
                  width={tower.w + stroke}
                  height={tower.h + stroke}
                  {...ring}
                />
              );
            })}
          </>
        }
        fills={
          <>
            <rect x={-body / 2} y={-body / 2} width={body} height={body} fill={fill} />
            {towers.map((tower, index) => {
              if (tower.kind === "octagon") {
                return <polygon key={`fill-${index}`} points={formatPoints(tower.points)} fill={fill} />;
              }
              return (
                <rect
                  key={`fill-${index}`}
                  x={tower.x - tower.w / 2}
                  y={tower.y - tower.h / 2}
                  width={tower.w}
                  height={tower.h}
                  fill={fill}
                />
              );
            })}
          </>
        }
      />
    </g>
  );
}

function ClerksHutMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const hut = clerksHut(size, level);
  const ring = useOutlineRing(1);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(hut.body, 0.5))} {...ring} />
            {hut.circles.map((circle, index) => (
              <circle key={index} cx={circle.x} cy={circle.y} r={circle.r + 0.5} {...ring} />
            ))}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(hut.body)} fill={fill} />
            {hut.circles.map((circle, index) => (
              <circle key={`fill-${index}`} cx={circle.x} cy={circle.y} r={circle.r} fill={fill} />
            ))}
          </>
        }
      />
    </g>
  );
}

function ArchiveMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = archiveOutline(size, level);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={<polygon points={formatPoints(offsetPolygon(outline, outset))} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    </g>
  );
}

function polygonPath(points: Point[]): string {
  return `M ${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" L ")} Z`;
}

function BuildersMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outer = buildersOutline(size, level);
  const hole = buildersHole(size, level);
  const wing = buildersWing(size, level);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outer, stroke / 2))} {...ring} />
            {hole ? <polygon points={formatPoints(offsetPolygon(hole, -stroke / 2))} {...ring} /> : null}
            {wing ? <polygon points={formatPoints(offsetPolygon(wing, stroke / 2))} {...ring} /> : null}
          </>
        }
        fills={
          <>
            {hole ? (
              <path d={`${polygonPath(outer)} ${polygonPath(hole)}`} fill={fill} fillRule="evenodd" />
            ) : (
              <polygon points={formatPoints(outer)} fill={fill} />
            )}
            {wing ? <polygon points={formatPoints(wing)} fill={fill} /> : null}
          </>
        }
      />
    </g>
  );
}

function FoundryMark({
  size,
  level,
  fill,
  brimstone = false,
}: {
  size: number;
  level: number;
  fill: string;
  brimstone?: boolean;
}) {
  const outline = foundryOutline(size, level);
  const domes = brimstone ? foundryFurnacePlates(size, level) : [];
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />
            {domes.map((points, index) => (
              <polygon
                key={index}
                points={formatPoints(offsetPolygon(points, stroke / 2))}
                {...ring}
                stroke={BRIMSTONE_INFUSION}
              />
            ))}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {domes.map((points, index) => (
              <polygon key={index} points={formatPoints(points)} fill={BRIMSTONE_INFUSION} />
            ))}
          </>
        }
      />
    </g>
  );
}

function AlchemistMark({ size, fill }: { size: number; fill: string }) {
  const hall = alchemistHall(size);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <rect
              x={-hall.width / 2 - outset}
              y={-hall.depth / 2 - outset}
              width={hall.width + stroke}
              height={hall.depth + stroke}
              {...ring}
            />
            <polygon points={formatPoints(offsetPolygon(hall.tower, outset))} {...ring} />
          </>
        }
        fills={
          <>
            <rect x={-hall.width / 2} y={-hall.depth / 2} width={hall.width} height={hall.depth} fill={fill} />
            <polygon points={formatPoints(hall.tower)} fill={fill} />
          </>
        }
      />
    </g>
  );
}

function CabinMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = cabinOutline(size, level);
  const tower = cabinTower(size, level);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, outset))} {...ring} />
            {tower ? <circle cx={tower.x} cy={tower.y} r={tower.r + outset} {...ring} /> : null}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {tower ? <circle cx={tower.x} cy={tower.y} r={tower.r} fill={fill} /> : null}
          </>
        }
      />
    </g>
  );
}

function BoneTempleMark({ size, fill }: { size: number; fill: string }) {
  const outline = boneTempleOutline(size);
  const corners = boneTempleSpikedCorners(size);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />
            {corners.map((corner, index) => (
              <polygon key={index} points={formatPoints(offsetPolygon(corner, stroke / 2))} {...ring} />
            ))}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {corners.map((corner, index) => (
              <polygon key={`fill-${index}`} points={formatPoints(corner)} fill={fill} />
            ))}
          </>
        }
      />
    </g>
  );
}

function PillarMark({ size, fill }: { size: number; fill: string }) {
  const outline = pillarOutline(size);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <BorderStack
      rings={<polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />}
      fills={<polygon points={formatPoints(outline)} fill={fill} />}
    />
  );
}

function BoneyardMark({ size, fill }: { size: number; fill: string }) {
  const outline = boneyardOutline(size);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={<polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    </g>
  );
}

function QuarryMark({ size, fill }: { size: number; fill: string }) {
  const outline = quarryOutline(size);
  const stroke = 1;
  const ring = useOutlineRing(stroke, "round");
  return (
    <g>
      <BorderStack
        rings={<polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    </g>
  );
}

function TimberMillMark({ size, fill }: { size: number; fill: string }) {
  const outline = timberMillOutline(size);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={<polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    </g>
  );
}

function LonghouseMark({ size, fill }: { size: number; fill: string }) {
  const outline = longhouseOutline(size);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={<polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    </g>
  );
}

function TradeMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = tradeOutline(size, level);
  const circles = tradeCircles(size, level);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, outset))} {...ring} />
            {circles.map((circle, index) => (
              <ellipse key={index} cx={circle.x} cy={circle.y} rx={circle.rx + outset} ry={circle.ry + outset} {...ring} />
            ))}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {circles.map((circle, index) => (
              <ellipse key={`fill-${index}`} cx={circle.x} cy={circle.y} rx={circle.rx} ry={circle.ry} fill={fill} />
            ))}
          </>
        }
      />
    </g>
  );
}

function TempleKnightCross({
  x,
  y,
  size,
  deepened,
}: {
  x: number;
  y: number;
  size: number;
  deepened: boolean;
}) {
  const ink = useMapInk();
  const stroke = 1;
  const rays = deepened ? templeKnightCrossRays(size, stroke / 2) : [];
  return (
    <g opacity={0.8}>
      <polygon
        points={formatPoints(templeKnightCross(size).map((point) => ({ x: point.x + x, y: point.y + y })))}
        fill="none"
        stroke={ink}
        strokeWidth={stroke}
        strokeLinejoin="miter"
        strokeMiterlimit={2}
      />
      {rays.map((ray, index) => (
        <line
          key={index}
          x1={ray[0].x + x}
          y1={ray[0].y + y}
          x2={ray[1].x + x}
          y2={ray[1].y + y}
          stroke={ink}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function AltarMark({
  size,
  level,
  fill,
  dedication = [],
  dedicationDeepened = null,
}: {
  size: number;
  level: number;
  fill: string;
  dedication?: readonly SanctumGod[];
  dedicationDeepened?: SanctumGod | null;
}) {
  const outline = altarOutline(size, level);
  const lobes = sanctumCircles(size, level);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  const { depth } = altarSpan(size, level);
  const sign = depth * 0.72 * 0.75;
  const chosen = new Set(dedication);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, outset))} {...ring} />
            {lobes.flatMap((lobe) =>
              lobe.corners.map((circle, index) => (
                <circle
                  key={`${lobe.god}-${index}`}
                  cx={circle.x}
                  cy={circle.y}
                  r={circle.r + outset}
                  {...ring}
                />
              )),
            )}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {lobes.flatMap((lobe) =>
              lobe.corners.map((circle, index) => (
                <circle key={`${lobe.god}-fill-${index}`} cx={circle.x} cy={circle.y} r={circle.r} fill={fill} />
              )),
            )}
          </>
        }
      />
      {lobes
        .filter((lobe) => chosen.has(lobe.god))
        .map((lobe) => (
          <TempleKnightCross
            key={lobe.god}
            x={lobe.x}
            y={lobe.y}
            size={sign}
            deepened={dedicationDeepened === lobe.god}
          />
        ))}
    </g>
  );
}

function TanneryMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = tanneryOutline(size, level);
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={<polygon points={formatPoints(offsetPolygon(outline, stroke / 2))} {...ring} />}
        fills={<polygon points={formatPoints(outline)} fill={fill} />}
      />
    </g>
  );
}

function BlacksmithMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const span = size * blacksmithScale(level);
  const outline = blacksmithOutline(span, span, level);
  const furnace = blacksmithFurnace(span, span);
  const annex = blacksmithAnnex(span, span, level);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  const pieces = annex ? [furnace, annex] : [furnace];
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, outset))} {...ring} />
            {pieces.map((piece) => (
              <rect
                key={`${piece.x}-${piece.y}`}
                x={piece.x - piece.w / 2 - outset}
                y={piece.y - piece.h / 2 - outset}
                width={piece.w + stroke}
                height={piece.h + stroke}
                {...ring}
              />
            ))}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {pieces.map((piece) => (
              <rect
                key={`${piece.x}-${piece.y}`}
                x={piece.x - piece.w / 2}
                y={piece.y - piece.h / 2}
                width={piece.w}
                height={piece.h}
                fill={fill}
              />
            ))}
          </>
        }
      />
    </g>
  );
}

/** Closed square centered on the origin, with the same radius on every corner. */
function roundedSquarePath(half: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, half));
  const left = -half;
  const right = half;
  const top = -half;
  const bottom = half;
  if (r <= 0) return `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
  return [
    `M ${left + r} ${top}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${left + r}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `V ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    `Z`,
  ].join(" ");
}

/**
 * Courtyard wall with rounded outer and inner corners. The village-facing
 * side is open between the gate jambs so the gate can sit in that span.
 */
function courtyardWallPath(
  out: number,
  inn: number,
  outerRadius: number,
  innerRadius: number,
  gateHalf: number,
): string {
  const ro = Math.max(0, Math.min(outerRadius, out));
  const ri = Math.max(0, Math.min(innerRadius, inn));
  const n = (value: number) => value.toFixed(2);
  return [
    `M ${n(gateHalf)} ${n(-out)}`,
    `H ${n(out - ro)}`,
    `A ${n(ro)} ${n(ro)} 0 0 1 ${n(out)} ${n(-out + ro)}`,
    `V ${n(out - ro)}`,
    `A ${n(ro)} ${n(ro)} 0 0 1 ${n(out - ro)} ${n(out)}`,
    `H ${n(-out + ro)}`,
    `A ${n(ro)} ${n(ro)} 0 0 1 ${n(-out)} ${n(out - ro)}`,
    `V ${n(-out + ro)}`,
    `A ${n(ro)} ${n(ro)} 0 0 1 ${n(-out + ro)} ${n(-out)}`,
    `H ${n(-gateHalf)}`,
    `V ${n(-inn)}`,
    `H ${n(-inn + ri)}`,
    `A ${n(ri)} ${n(ri)} 0 0 0 ${n(-inn)} ${n(-inn + ri)}`,
    `V ${n(inn - ri)}`,
    `A ${n(ri)} ${n(ri)} 0 0 0 ${n(-inn + ri)} ${n(inn)}`,
    `H ${n(inn - ri)}`,
    `A ${n(ri)} ${n(ri)} 0 0 0 ${n(inn)} ${n(inn - ri)}`,
    `V ${n(-inn + ri)}`,
    `A ${n(ri)} ${n(ri)} 0 0 0 ${n(inn - ri)} ${n(-inn)}`,
    `H ${n(gateHalf)}`,
    `Z`,
  ].join(" ");
}

/** Solid outer shape of the coinhouse wall, so the house inside is not part of the highlight. */
function coinhouseOuterFill(layout: ReturnType<typeof coinhouseLayout>): ReactNode {
  const corner = layout.wallCorner;
  const gate = layout.gate;
  return (
    <>
      {corner ? <path d={roundedSquarePath(corner.out, corner.outerRadius)} fill="#000" /> : null}
      {gate ? (
        <rect x={gate.x - gate.w / 2} y={gate.y - gate.h / 2} width={gate.w} height={gate.h} fill="#000" />
      ) : null}
      {layout.octagons.map((octagon, index) => (
        <polygon key={index} points={formatPoints(octagon)} fill="#000" />
      ))}
    </>
  );
}

function CoinhouseMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const layout = coinhouseLayout(size, level);
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  const corner = layout.wallCorner;
  const gate = layout.gate;
  const wallStroke = corner && gate
    ? courtyardWallPath(corner.out + outset, corner.inn - outset, corner.outerRadius + outset, Math.max(0, corner.innerRadius - outset), gate.w / 2)
    : null;
  const wallFill = corner && gate
    ? courtyardWallPath(corner.out, corner.inn, corner.outerRadius, corner.innerRadius, gate.w / 2)
    : null;
  return (
    <g>
      <BorderStack
        rings={
          <>
            <rect
              x={-layout.house.w / 2 - outset}
              y={-layout.house.h / 2 - outset}
              width={layout.house.w + stroke}
              height={layout.house.h + stroke}
              {...ring}
            />
            {layout.octagons.map((octagon, index) => (
              <polygon key={`oct-${index}`} points={formatPoints(offsetPolygon(octagon, outset))} {...ring} />
            ))}
            {wallStroke ? <path d={wallStroke} {...ring} /> : null}
            {gate ? (
              <rect
                x={gate.x - gate.w / 2 - outset}
                y={gate.y - gate.h / 2 - outset}
                width={gate.w + stroke}
                height={gate.h + stroke}
                {...ring}
              />
            ) : null}
          </>
        }
        fills={
          <>
            <rect x={-layout.house.w / 2} y={-layout.house.h / 2} width={layout.house.w} height={layout.house.h} fill={fill} />
            {layout.octagons.map((octagon, index) => (
              <polygon key={`oct-fill-${index}`} points={formatPoints(octagon)} fill={fill} />
            ))}
            {wallFill ? <path d={wallFill} fill={fill} /> : null}
            {gate ? (
              <rect
                x={gate.x - gate.w / 2}
                y={gate.y - gate.h / 2}
                width={gate.w}
                height={gate.h}
                fill={fill}
              />
            ) : null}
          </>
        }
        outline={layout.walls.length === 0 ? undefined : coinhouseOuterFill(layout)}
      />
    </g>
  );
}

export function BuildingMark({
  size,
  tier,
  tuning,
  shape = "square",
  buildingId,
  heartfireLevel = 5,
  ebonGrace = false,
  brimstoneInfusion = false,
  dedication = [],
  dedicationDeepened = null,
}: {
  size: number;
  tier: number;
  tuning: MarkTuning;
  shape?: Footprint;
  buildingId?: string;
  /** Live Feed Fire level. The demo leaves this at the full fire. */
  heartfireLevel?: number;
  ebonGrace?: boolean;
  /** Two small half-circles on the outside of each furnace after Brimstone Infusion. */
  brimstoneInfusion?: boolean;
  dedication?: readonly SanctumGod[];
  dedicationDeepened?: SanctumGod | null;
}) {
  const ink = useMapInk();
  const level = Math.max(1, tier);
  if (buildingId === "storage") {
    return <StorageMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "blacksmith") {
    return <BlacksmithMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "cabin") {
    return <CabinMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "tannery") {
    return <TanneryMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "longhouse") {
    return <LonghouseMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "boneyard") {
    return <BoneyardMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "quarry") {
    return <QuarryMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "timberMill") {
    return <TimberMillMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "pillarOfClarity") {
    return <PillarMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "blackMonolith") {
    return <BuildingFootprint size={size} shape="round" fill={tuning.fill} strokeWidth={1} />;
  }
  if (buildingId === "boneTemple") {
    return <BoneTempleMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "trade") {
    return <TradeMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "altar") {
    return (
      <AltarMark
        size={size}
        level={level}
        fill={tuning.fill}
        dedication={dedication}
        dedicationDeepened={dedicationDeepened}
      />
    );
  }
  if (buildingId === "alchemistHall") {
    return <AlchemistMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "clerksHut") {
    return <ClerksHutMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "archive") {
    return <ArchiveMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "builders") {
    return <BuildersMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "foundry") {
    return <FoundryMark size={size} level={level} fill={tuning.fill} brimstone={brimstoneInfusion} />;
  }
  if (buildingId === "coinhouse") {
    return <CoinhouseMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "heartfire") {
    return (
      <HeartfireMark
        size={size}
        fill={tuning.fill}
        fire={tuning.fire}
        level={heartfireLevel}
        ebonGrace={ebonGrace}
      />
    );
  }
  if (shape === "estate") {
    return (
      <BuildingFootprint
        size={size}
        shape="estate"
        fill={tuning.fill}
        strokeWidth={level > 1 ? ESTATE_BORDER : 1}
        level={level}
      />
    );
  }
  if (shape === "pit") {
    const grown = size * pitScale(level);
    return (
      <g>
        <path d={smoothClosedPath(pitOutline(grown))} fill={tuning.fill} stroke={ink} strokeWidth={1} />
        <SilhouetteHighlight stroke={1}>
          <path d={smoothClosedPath(pitOutline(grown))} fill="#000" />
        </SilhouetteHighlight>
        {pitContourScales(level).map((scale) => (
          <path
            key={scale}
            d={smoothClosedPath(pitOutline(grown * scale))}
            fill="none"
            stroke={ink}
            strokeOpacity={0.45}
            strokeWidth={1.25}
            strokeLinejoin="round"
          />
        ))}
      </g>
    );
  }
  const special = shape === "cross";
  const fill = (
    <BuildingFootprint
      key="fill"
      size={size}
      shape={shape}
      fill={tuning.fill}
      strokeWidth={shape === "bastion" || shape === "watchtower" ? bastionOutlineWidth(level) : 1}
      outwardBorder={!special}
      level={level}
    />
  );
  if (shape === "cross" && level > 1) {
    return <g transform="rotate(180)">{fill}</g>;
  }
  return fill;
}

/** Buildings with their own drawing. */
const UPGRADE_RULES = new Set(["storage", "pit", "watchtower", "estate", "paleCross", "blacksmith", "cabin", "tannery", "alchemistHall", "clerksHut", "archive", "builders", "foundry", "timberMill", "trade", "altar", "coinhouse", "boneTemple"]);

export const UPGRADE_ICON_SIZE: Record<string, number> = {
  storage: 18,
  pit: 8,
  watchtower: 28,
  estate: 9,
  paleCross: 27.5,
  blacksmith: 16,
  cabin: 18,
  tannery: 14,
  alchemistHall: 9,
  clerksHut: 10,
  archive: 10,
  builders: 18,
  foundry: 14,
  timberMill: 14,
  trade: 10,
  altar: 8,
  coinhouse: 12,
  boneTemple: 32,
};

export function UpgradeRuleIcon({
  buildingId,
  tier,
  tuning,
}: {
  buildingId: string;
  tier: number;
  tuning: MarkTuning;
}) {
  if (!UPGRADE_RULES.has(buildingId)) return null;
  const level = Math.max(1, tier);
  return (
    <MapInkContext.Provider value={tuning.ink}>
      <svg
        width="20"
        height="20"
        viewBox="-34 -34 68 68"
        aria-hidden
        className="shrink-0"
      >
        <title>Upgrade drawing</title>
        <g transform={upgradeIconTurn(buildingId)} filter={outlineWobble(`${buildingId}:${level - 1}`)}>
          <BuildingMark
            buildingId={buildingId}
            size={UPGRADE_ICON_SIZE[buildingId] ?? 14}
            tier={level}
            tuning={tuning}
            shape={footprintOf(buildingId)}
          />
        </g>
      </svg>
    </MapInkContext.Provider>
  );
}

/** Outside points up. The blacksmith keeps its right side on the right. */
function upgradeIconTurn(buildingId: string): string | undefined {
  if (buildingId === "storage") return "rotate(180)";
  if (buildingId === "builders") return "rotate(180) scale(1 -1)";
  if (
    buildingId === "blacksmith" ||
    buildingId === "cabin" ||
    buildingId === "tannery" ||
    buildingId === "alchemistHall" ||
    buildingId === "clerksHut" ||
    buildingId === "archive" ||
    buildingId === "foundry" ||
    buildingId === "timberMill" ||
    buildingId === "trade" ||
    buildingId === "altar" ||
    buildingId === "coinhouse"
  ) {
    return "scale(1 -1)";
  }
  return undefined;
}

function TrapMark({
  size,
  stroke,
  color,
  improved,
}: {
  size: number;
  stroke: number;
  color: string;
  improved: boolean;
}) {
  const arms = () => (
    <>
      <line x1={-size} y1={-size} x2={size} y2={size} />
      <line x1={-size} y1={size} x2={size} y2={-size} />
    </>
  );
  const mark = (
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square">
      {arms()}
      {improved ? <circle r={0.85} fill={color} stroke="none" /> : null}
    </g>
  );
  return (
    <g>
      {mark}
      <SilhouetteHighlight stroke={stroke} outsideOnly>
        {mark}
      </SilhouetteHighlight>
    </g>
  );
}

function DrawbridgeMark({
  bridge,
  fill,
  at,
  hatchReach,
  stroke,
}: {
  bridge: BastionDrawbridge;
  fill: string;
  at: Point;
  /** Wall hatch reach, so the deck stripes sit on the same lines as the palisade. */
  hatchReach: number;
  /** Bastion rim. The rails sit entirely outside the deck, same as that border. */
  stroke: number;
}) {
  const ink = useMapInk();
  const hatchId = `bridge-hatch-${useId().replace(/:/g, "")}`;
  const { near, mouth, far, half } = bridge;
  const outset = stroke / 2;
  const deck = `${(-half).toFixed(2)},${near.toFixed(2)} ${half.toFixed(2)},${near.toFixed(2)} ${half.toFixed(2)},${far.toFixed(2)} ${(-half).toFixed(2)},${far.toFixed(2)}`;
  const left = -half - outset;
  const right = half + outset;
  const end = far + outset;
  const rail = `M ${left.toFixed(2)} ${mouth.toFixed(2)} L ${left.toFixed(2)} ${end.toFixed(2)} L ${right.toFixed(2)} ${end.toFixed(2)} L ${right.toFixed(2)} ${mouth.toFixed(2)}`;
  const hatch = hatchReach > 0 ? bridgeHatchPaths(at, bridge, hatchReach) : [];
  return (
    <g data-testid="drawbridge">
      <polygon points={deck} fill={fill} />
      {hatch.length > 0 ? (
        <>
          <defs>
            <clipPath id={hatchId}>
              <polygon points={deck} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${hatchId})`} style={{ pointerEvents: "none" }}>
            <g
              fill="none"
              stroke={ink}
              strokeWidth={CROSSED_HATCH_WIDTH}
              strokeOpacity={0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {hatch.map((d, index) => (
                <path key={index} d={d} />
              ))}
            </g>
          </g>
        </>
      ) : null}
      <path
        d={rail}
        fill="none"
        stroke={ink}
        strokeWidth={stroke}
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
      <SilhouetteHighlight stroke={stroke}>
        <polygon points={deck} fill={fill} />
      </SilhouetteHighlight>
    </g>
  );
}

function SlotMark({
  slot,
  tier,
  tuning,
  highlighted = false,
  fadeHighlight = false,
  heartfireLevel = 5,
  ebonGrace = false,
  brimstoneInfusion = false,
  dedication = [],
  dedicationDeepened = null,
  drawbridge = null,
  hatchReach = 0,
}: {
  slot: PlacedSlot;
  tier: number;
  tuning: Tuning;
  highlighted?: boolean;
  /** Extra outline stays thick for 3s, then fades to the normal border over the last 1s. */
  fadeHighlight?: boolean;
  heartfireLevel?: number;
  ebonGrace?: boolean;
  brimstoneInfusion?: boolean;
  dedication?: readonly SanctumGod[];
  dedicationDeepened?: SanctumGod | null;
  drawbridge?: BastionDrawbridge | null;
  /** How far the wall hatch reaches, so a drawbridge can reuse those lines. */
  hatchReach?: number;
}) {
  return (
    <MapHighlightFadeContext.Provider value={fadeHighlight}>
      <MapBorderExtraContext.Provider value={highlighted ? MAP_HIGHLIGHT_BORDER : 0}>
        <g
          data-facing=""
          transform={markRotation(slot.buildingId, slot)}
          // The heartfire circle stays smooth. Its stripes wobble on their own.
          // A reveal stroke inside this filter does not paint while the parent fade
          // animates opacity, so the wobble waits until that border has eased off.
          filter={
            slot.buildingId === "heartfire" || fadeHighlight ? undefined : outlineWobble(slot.id)
          }
        >
          {drawbridge ? (
            <DrawbridgeMark
              bridge={drawbridge}
              fill={tuning.fill}
              at={slot}
              hatchReach={hatchReach}
              stroke={bastionOutlineWidth(tier)}
            />
          ) : null}
          <BuildingMark
            buildingId={slot.buildingId}
            size={
              slot.buildingId === "watchtower"
                ? watchtowerWidth(tuning.squareSize, 1)
                : markSize(slot.buildingId, tuning.squareSize)
            }
            tier={tier}
            tuning={tuning}
            shape={footprintOf(slot.buildingId)}
            heartfireLevel={heartfireLevel}
            ebonGrace={ebonGrace}
            brimstoneInfusion={brimstoneInfusion}
            dedication={dedication}
            dedicationDeepened={dedicationDeepened}
          />
        </g>
      </MapBorderExtraContext.Provider>
    </MapHighlightFadeContext.Provider>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mixHex(from: string, to: string, t: number): string {
  if (from.length < 7 || to.length < 7) return from;
  const start = Number.parseInt(from.slice(1, 7), 16);
  const end = Number.parseInt(to.slice(1, 7), 16);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return from;
  const channel = (shift: number) => {
    const a = (start >> shift) & 255;
    const b = (end >> shift) & 255;
    return Math.round(a + (b - a) * t);
  };
  const mixed = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${mixed.toString(16).padStart(6, "0")}`;
}

function openChain(points: Point[]): string {
  if (points.length === 0) return "";
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index++) {
    path += ` L ${points[index].x.toFixed(2)} ${points[index].y.toFixed(2)}`;
  }
  return path;
}

/** Dilated ring around each track. The door mask has to cover this, not only the fill. */
const PATH_OUTLINE_RADIUS = 0.75;
/** Gravel fill and stones. The outline is a sibling, so this does not tint the ring. */
const PATH_GRAVEL_OPACITY = 0.7;
/** Painted ring. Kept off the gravel group so this is the opacity on the page. */
const PATH_OUTLINE_OPACITY = 0.3;
/** Hand-drawn bend of the ring, in map units. */
const PATH_OUTLINE_WOBBLE = 2.5;
/**
 * Stroke centered on the ribbon edge. Half of this must clear the ring and its wobble,
 * or the ring past a hooked door stays solid while the fill fades.
 */
const PATH_OUTLINE_FADE_STROKE = 11;

/** One end's opacity fade. Several ends nest, so a door and the heartfire can both fade. */
function PathEndFades({
  fades,
  idPrefix,
  frame,
  children,
}: {
  fades: PathFade[];
  idPrefix: string;
  frame: { x: number; y: number; size: number };
  children: ReactNode;
}) {
  return fades.reduce<ReactNode>((inner, fade, index) => {
    const id = `${idPrefix}-${index}`;
    return (
      <g mask={`url(#${id})`}>
        <linearGradient
          id={`${id}-grad`}
          gradientUnits="userSpaceOnUse"
          x1={fade.from.x}
          y1={fade.from.y}
          x2={fade.to.x}
          y2={fade.to.y}
        >
          <stop offset="0" stopColor="#000" />
          <stop offset={fade.clear} stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask
          id={id}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={frame.x}
          y={frame.y}
          width={frame.size}
          height={frame.size}
        >
          <rect x={frame.x} y={frame.y} width={frame.size} height={frame.size} fill={`url(#${id}-grad)`} />
        </mask>
        {inner}
      </g>
    );
  }, children);
}

/** A stretch waits until every building it serves has finished appearing. */
function pathWaitsForBuilding(path: VillagePath, reveal: VillageMapReveal | null): boolean {
  if (!reveal || prefersReducedMotion()) return false;
  const firstTime = (id: string) => reveal.fadeIn[id] === true && reveal.fadeOutTier[id] == null;
  if (firstTime("heartfire:0")) return true;
  const served = path.slotIds;
  if (!served.some(firstTime)) return false;
  return served.every(firstTime);
}

/** A first appearance and an upgrade each get their own thick border. */
function revealFadeSignature(reveal: VillageMapReveal | null, slotId: string): string | null {
  if (reveal?.fadeIn[slotId] !== true) return null;
  const previous = reveal.fadeOutTier[slotId];
  return previous == null ? "in" : `up:${previous}`;
}

const NO_TREES: MapTree[] = [];

function applyBuildingHighlight(svg: SVGSVGElement | null, highlightId: string | null) {
  if (!svg) return;
  for (const el of svg.querySelectorAll("[data-building].is-highlighted")) {
    el.classList.remove("is-highlighted");
  }
  if (!highlightId) return;
  for (const el of svg.querySelectorAll(`[data-building="${CSS.escape(highlightId)}"]`)) {
    el.classList.add("is-highlighted");
  }
}

function moveSlotElement(el: SVGGElement, buildingId: string, at: Point) {
  el.setAttribute("transform", `translate(${at.x} ${at.y})`);
  const rotation = markRotation(buildingId, at);
  for (const mark of el.querySelectorAll("[data-facing]")) {
    if (rotation) mark.setAttribute("transform", rotation);
    else mark.removeAttribute("transform");
  }
}

function applyDraggingSlot(svg: SVGSVGElement | null, slotId: string | null) {
  if (!svg) return;
  for (const el of svg.querySelectorAll("[data-slot].is-dragging")) {
    el.classList.remove("is-dragging");
  }
  if (!slotId) return;
  svg.querySelector(`[data-slot="${CSS.escape(slotId)}"]`)?.classList.add("is-dragging");
}

type VillageMapProps = {
  build: BuildState;
  tuning: Tuning;
  overrides: Record<string, Point>;
  pathOverrides: Record<string, Point>;
  highlightId: string | null;
  onOverride: (id: string, point: Point | null) => void;
  onPathOverride: (id: string, point: Point | null) => void;
  onActiveLabel: (label: string | null) => void;
  onHoverBuilding?: (buildingId: string | null) => void;
  reveal?: VillageMapReveal | null;
  readOnly?: boolean;
  /** Current Feed Fire level, 0 through 5. */
  heartfireLevel?: number;
  /** Crowns planted on the demo map. The game map leaves this empty. */
  trees?: MapTree[];
  /** Variant id armed for the next click on open ground. */
  placingTree?: string | null;
  onPlaceTree?: (point: Point) => void;
  onMoveTree?: (id: string, point: Point) => void;
  onRemoveTree?: (id: string) => void;
};

type VillageMapSvgProps = Omit<VillageMapProps, "highlightId"> & {
  svgRef: RefObject<SVGSVGElement>;
  highlightRef: { current: string | null };
  setMaskHost: (node: SVGDefsElement | null) => void;
};

const VillageMapSvg = memo(function VillageMapSvg({
  build,
  tuning,
  overrides,
  pathOverrides,
  onOverride,
  onPathOverride,
  onActiveLabel,
  onHoverBuilding,
  reveal = null,
  readOnly = false,
  heartfireLevel = 5,
  trees = NO_TREES,
  placingTree = null,
  onPlaceTree,
  onMoveTree,
  onRemoveTree,
  svgRef,
  highlightRef,
  setMaskHost,
}: VillageMapSvgProps) {
  const dragRef = useRef<{ id: string; dx: number; dy: number; buildingId: string } | null>(null);
  const pathDragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const treeDragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const pendingSlotRef = useRef<Point | null>(null);
  const pendingPathRef = useRef<Point | null>(null);
  const pendingTreeRef = useRef<Point | null>(null);
  const draggingSlotRef = useRef<string | null>(null);
  const pathNodesRef = useRef<Map<string, { ribbon: Element | null; hit: Element | null }> | null>(null);
  pathNodesRef.current = null;
  const treeWobbleId = `tree-wobble-${useId().replace(/:/g, "")}`;
  // After a real commit only. Highlight changes are applied by VillageMapHighlight
  // and must not rebuild this svg.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    applyBuildingHighlight(svg, highlightRef.current);
    applyDraggingSlot(svg, draggingSlotRef.current);
  });
  // Per slot, the fade signature whose thick border has already eased off.
  // A shared flag was cleared by whichever animation ended first, so some fades lost the border.
  const [easedBorder, setEasedBorder] = useState<Record<string, string>>({});
  const [pathReady, setPathReady] = useState<Record<string, true>>({});
  const moatClipId = `moat-clip-${useId().replace(/:/g, "")}`;
  const wallMaskId = `wall-hatch-${useId().replace(/:/g, "")}`;
  const pathClipId = `path-clip-${useId().replace(/:/g, "")}`;
  const pathOutlineFilterId = `path-outline-${useId().replace(/:/g, "")}`;
  const pathDoorMaskId = `path-door-${useId().replace(/:/g, "")}`;
  const pathHeartMaskId = `path-heart-${useId().replace(/:/g, "")}`;
  const pathFadeId = `path-fade-${useId().replace(/:/g, "")}`;
  const radius = layoutWallRadius(tuning);
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const hutSize = buildingHutSize(tuning.squareSize, build.counts.storage ?? 0);
  const markTuning = hutSize === tuning.squareSize ? tuning : { ...tuning, squareSize: hutSize };
  const slots = useMemo(
    () =>
      containSlots(
        placedSlots(build, tuning, overrides),
        radius,
        tuning,
        thickness,
        build.wall,
        hutSize,
      ),
    [build, tuning, overrides, radius, thickness, hutSize],
  );
  const pathField = useMemo(
    () =>
      buildVillagePathField({
        slots,
        hutSize,
        wallLevel: build.wall,
        radius,
        wallStroke: thickness,
        tuning,
      }),
    [slots, hutSize, build.wall, radius, thickness, tuning],
  );
  const paths = useMemo(
    () => villagePathDrawings(pathField, pathOverrides),
    [pathField, pathOverrides],
  );
  const hiddenTrees = useMemo(() => {
    const covered = new Set<string>();
    const wallOn = build.wall > 0;
    const wallLine = wallOn ? wallPolygon(radius, tuning) : [];
    const inkHalf = wallOn ? (thickness + VILLAGE_INK_GAP + PALISADE_BORDER) / 2 : 0;
    const plating = wallOn && build.chitin ? thickness / 2 + CHITIN_STROKE + CHITIN_SPIKE_LENGTH : 0;
    const wallHalf = Math.max(inkHalf, plating);
    const wallTowers = wallOn ? palisadeTowers(build.wall, radius, tuning, tuning.squareSize) : [];
    const towerPad = PALISADE_TOWER_STROKE / 2 + (wallOn && build.chitin ? CHITIN_STROKE : 0);
    const slotReach = slots.map((slot) => buildingReach(slot.buildingId, hutSize, slot.tier));
    for (const tree of trees) {
      const variant = treeVariant(tree.variant);
      if (!variant) continue;
      const center = { x: tree.x, y: tree.y };
      const reach = treeReach(variant) * treeDrawScale(tree);
      const onPath = paths.some((path) => pathMeetsCircle(path.points, center, reach));
      const onPalisade =
        wallOn && circleMeetsPalisade(center, reach, wallLine, wallHalf, wallTowers, towerPad);
      const onBuilding = slots.some((slot, index) => {
        if (Math.hypot(slot.x - center.x, slot.y - center.y) > reach + slotReach[index]) return false;
        return circleMeetsBuilding(center, reach, slot.buildingId, slot, hutSize, slot.tier);
      });
      if (onPath || onPalisade || onBuilding) covered.add(tree.id);
    }
    return covered;
  }, [trees, paths, build.wall, build.chitin, radius, tuning, thickness, slots, hutSize]);
  const trackFill = mixHex(tuning.interior, "#a79f94", 0.38);
  const stoneDark = mixHex("#6e6860", tuning.interior, 0.5);
  const stoneMid = mixHex("#8f8880", tuning.interior, 0.62);
  const showWall = build.wall > 0 || tuning.showWallGuide;
  const outline = ringPoints(radius, tuning);
  const outlinePath = smoothClosedPath(outline);
  let wallReach = 0;
  if (build.wall > 0) {
    for (const point of outline) {
      wallReach = Math.max(wallReach, Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER));
    }
    wallReach += thickness / 2;
  }
  const wallHatch = build.wall > 0 ? localHatchPaths(wallReach) : [];
  // Moat and traps stay put while the palisade line itself gets heavier.
  const anchor = tuning.wallThickness * 1.52;
  const towers = palisadeTowers(build.wall, radius, tuning, tuning.squareSize);
  const moatCenter = build.moat && build.wall > 0 ? moatCenterRadius(radius, anchor) : 0;
  const drawbridgeBySlot = new Map<string, BastionDrawbridge>();
  if (moatCenter > 0) {
    for (const slot of slots) {
      if (slot.buildingId !== "bastion") continue;
      const bridge = bastionDrawbridge(slot, hutSize, radius, anchor, tuning);
      if (bridge) drawbridgeBySlot.set(slot.id, bridge);
    }
  }
  const moatPoints = moatCenter > 0 ? moatRingPoints(moatCenter, tuning) : null;
  const moatEdges = moatCenter > 0 ? moatBandEdges(moatCenter, tuning) : null;
  const moatBand = moatEdges
    ? `${smoothClosedPath(moatEdges.outer)} ${smoothClosedPath(moatEdges.inner)}`
    : null;
  const chitinBoundary =
    build.chitin && build.wall > 0
      ? wallChitinPolygon(radius, tuning, thickness, CHITIN_STROKE)
      : null;
  const bastionChains =
    chitinBoundary == null
      ? []
      : slots.flatMap((slot) =>
        slot.buildingId === "bastion"
          ? bastionChitinChains(
            slot,
            markSize("bastion", hutSize),
            bastionOutlineWidth(slot.tier),
            CHITIN_STROKE,
            chitinBoundary,
          )
          : [],
      );
  const bastionSpans: WallChitinSpan[] = bastionChains.flatMap((chain) =>
    chain.length < 2
      ? []
      : [
        {
          from: chain[0],
          to: chain[chain.length - 1],
          via: chain[Math.floor(chain.length / 2)],
        },
      ],
  );
  const fortBlockers: ChitinBlocker[] =
    chitinBoundary == null
      ? []
      : slots.flatMap((slot) => {
        if (slot.buildingId === "watchtower") {
          const width = watchtowerWidth(hutSize, slot.tier);
          const stroke = bastionOutlineWidth(slot.tier);
          return [
            {
              kind: "circle" as const,
              x: slot.x,
              y: slot.y,
              r: width / 2 + stroke + CHITIN_STROKE / 2,
            },
          ];
        }
        return [];
      });
  const chitinBlockers: ChitinBlocker[] =
    chitinBoundary == null
      ? []
      : [
        ...towers.map((tower) => ({
          kind: "circle" as const,
          x: tower.x,
          y: tower.y,
          r: tower.r + palisadeTowerChitinOutset(CHITIN_STROKE),
        })),
        ...fortBlockers,
      ];
  const wallChitinPaths =
    chitinBoundary == null
      ? []
      : wallChitinOpenPaths(chitinBoundary, chitinBlockers, bastionSpans);
  const fortChitin =
    chitinBoundary == null
      ? []
      : slots.flatMap((slot) => {
        if (slot.buildingId === "bastion") {
          const gate = drawbridgeBySlot.get(slot.id);
          return bastionChitinPaths(
            slot,
            markSize("bastion", hutSize),
            bastionOutlineWidth(slot.tier),
            CHITIN_STROKE,
            chitinBoundary,
            gate ? drawbridgeChitinGap(gate.half, bastionOutlineWidth(slot.tier)) : 0,
          ).map((d, index) => ({ key: `${slot.id}-chitin-${index}`, d }));
        }
        if (slot.buildingId === "watchtower") {
          return watchtowerChitinPaths(
            slot,
            watchtowerWidth(hutSize, slot.tier),
            Math.max(1, slot.tier),
            bastionOutlineWidth(slot.tier),
            CHITIN_STROKE,
            chitinBoundary,
          ).map((d, index) => ({ key: `${slot.id}-chitin-${index}`, d }));
        }
        return [];
      });
  const chitinSpikes: ChitinSpike[] =
    chitinBoundary == null
      ? []
      : [
        ...wallChitinOpenChains(chitinBoundary, chitinBlockers, bastionSpans).flatMap((chain) =>
          chitinSpikesAlongPolyline(chain, CHITIN_STROKE, { closed: false }),
        ),
        ...towers.flatMap((tower) =>
          polyOutsideChitinChains(
            palisadeTowerRim(tower, palisadeTowerChitinOutset(CHITIN_STROKE)),
            chitinBoundary,
          ).flatMap((chain) => chitinSpikesAlongPolyline(chain, CHITIN_STROKE, { closed: false })),
        ),
        ...slots.flatMap((slot) => {
          if (slot.buildingId === "bastion") {
            const gate = drawbridgeBySlot.get(slot.id);
            return bastionChitinChains(
              slot,
              markSize("bastion", hutSize),
              bastionOutlineWidth(slot.tier),
              CHITIN_STROKE,
              chitinBoundary,
              gate ? drawbridgeChitinGap(gate.half, bastionOutlineWidth(slot.tier)) : 0,
            ).flatMap((chain) =>
              chitinSpikesAlongPolyline(chain, CHITIN_STROKE, { closed: false, outside: "left" }),
            );
          }
          if (slot.buildingId === "watchtower") {
            return watchtowerChitinChains(
              slot,
              watchtowerWidth(hutSize, slot.tier),
              Math.max(1, slot.tier),
              bastionOutlineWidth(slot.tier),
              CHITIN_STROKE,
              chitinBoundary,
            ).flatMap((chain) =>
              chitinSpikesAlongPolyline(chain, CHITIN_STROKE, { closed: false }),
            );
          }
          return [];
        }),
      ];
  const areaLevel = trapAreaLevel(build);
  const laidTraps =
    areaLevel > 0
      ? trapsClearOfBuildings(
        trapPoints(
          radius,
          tuning,
          areaLevel,
          anchor,
          trapWallOutset(build.wall, thickness, tuning.squareSize, build.chitin ? CHITIN_STROKE : 0),
        ),
        tuning,
        areaLevel,
        build.wall,
        radius,
        slots,
        hutSize,
        [...drawbridgeBySlot.values()].map((bridge) => bridge.deck),
        build.chitin ? CHITIN_STROKE : 0,
        slots.reduce(
          (pad, slot) =>
            drawbridgeBySlot.has(slot.id) ? Math.max(pad, bastionOutlineWidth(slot.tier)) : pad,
          0,
        ),
      )
      : [];
  const traps = build.traps > 0 ? laidTraps : [];
  const ground = villageGroundPoints(
    radius,
    tuning,
    { traps: areaLevel, moat: build.moat, wall: build.wall },
    laidTraps,
  );
  const groundPath = smoothClosedPath(ground);
  const placeableGround = furthestVillageGround(radius, tuning);
  const concealedTrees = new Set(hiddenTrees);
  const trapReach = build.traps > 0 ? trapMarkReach(tuning, build.traps) : 0;
  for (const tree of trees) {
    if (concealedTrees.has(tree.id)) continue;
    const variant = treeVariant(tree.variant);
    if (!variant) {
      concealedTrees.add(tree.id);
      continue;
    }
    const center = { x: tree.x, y: tree.y };
    const onPaper = pointInPolygon(center, ground);
    const onFuturePaper = pointInPolygon(center, placeableGround);
    if (!onPaper && onFuturePaper) {
      concealedTrees.add(tree.id);
      continue;
    }
    const reach = treeReach(variant) * treeDrawScale(tree);
    if (moatEdges && treeMeetsMoat(center, reach, moatEdges)) {
      concealedTrees.add(tree.id);
      continue;
    }
    if (onPaper && trapReach > 0 && treeMeetsTrap(center, reach, traps, trapReach)) {
      concealedTrees.add(tree.id);
    }
  }
  const improved = build.traps >= 2;
  const trapScale = trapMarkScale(build.traps);
  const trapSize = trapArmLength(tuning, build.traps);
  const trapStroke = tuning.trapStroke * TRAP_DRAW_SCALE * trapScale;
  const trapTarget = trapHitRadius(tuning, build.traps);
  const framePoints = mapFramePoints(build, tuning, slots);
  if (placingTree && onPlaceTree) framePoints.push(...placeableGround);
  for (const tree of trees) {
    if (concealedTrees.has(tree.id)) continue;
    const variant = treeVariant(tree.variant);
    const reach = variant ? treeReach(variant) * treeDrawScale(tree) : 16;
    framePoints.push(
      { x: tree.x - reach, y: tree.y - reach },
      { x: tree.x + reach, y: tree.y + reach },
    );
  }
  if (build.wall > 0) {
    const wallInk = Math.max(
      (thickness + VILLAGE_INK_GAP + PALISADE_BORDER) / 2,
      build.chitin ? thickness / 2 + CHITIN_STROKE + CHITIN_SPIKE_LENGTH : 0,
    );
    framePoints.push(...outsetFromCenter(outline, wallInk));
    const towerInk = build.chitin
      ? palisadeTowerChitinOutset(CHITIN_STROKE) + CHITIN_STROKE / 2 + CHITIN_SPIKE_LENGTH
      : PALISADE_TOWER_STROKE / 2;
    for (const tower of towers) {
      const reach = tower.r + towerInk;
      framePoints.push(
        { x: tower.x - reach, y: tower.y },
        { x: tower.x + reach, y: tower.y },
        { x: tower.x, y: tower.y - reach },
        { x: tower.x, y: tower.y + reach },
      );
    }
  }
  const viewBox = tuning.fitView
    ? fittedViewBox(framePoints, MAP_VIEW_PAD)
    : "0 0 1000 1000";
  const [frameX, frameY, frameSize] = viewBox.split(" ").map(Number);

  const toSvg = (event: ReactPointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGGElement>, slot: PlacedSlot) => {
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail for a synthetic event. The drag still tracks on the mark.
    }
    const point = toSvg(event);
    pendingSlotRef.current = null;
    dragRef.current = { id: slot.id, dx: slot.x - point.x, dy: slot.y - point.y, buildingId: slot.buildingId };
    onActiveLabel(slot.label);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toSvg(event);
    const moving = slots.find((slot) => slot.id === drag.id);
    if (!moving) return;
    const next = constrainMove(
      moving,
      { x: point.x + drag.dx, y: point.y + drag.dy },
      slots,
      radius,
      tuning,
      build.wall,
      hutSize,
    );
    pendingSlotRef.current = next;
    moveSlotElement(event.currentTarget, drag.buildingId, next);
  };

  const finishSlotDrag = (el?: SVGGElement) => {
    el?.classList.remove("is-dragging");
    const drag = dragRef.current;
    const point = pendingSlotRef.current;
    dragRef.current = null;
    pendingSlotRef.current = null;
    draggingSlotRef.current = null;
    if (!drag || !point) return;
    const origin = slots.find((slot) => slot.id === drag.id);
    if (origin && origin.x === point.x && origin.y === point.y) return;
    onOverride(drag.id, point);
  };

  const onPathPointerDown = (event: ReactPointerEvent<SVGPathElement>, path: VillagePath) => {
    event.stopPropagation();
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail for a synthetic event. The drag still tracks on the path.
    }
    const point = toSvg(event);
    pathDragRef.current = { id: path.id, dx: path.handle.x - point.x, dy: path.handle.y - point.y };
    onActiveLabel("Path");
  };

  const previewPath = (id: string, point: Point) => {
    const svg = svgRef.current;
    if (!svg) return;
    const drawings = villagePathDrawings(pathField, { ...pathOverrides, [id]: point });
    let nodes = pathNodesRef.current;
    if (!nodes) {
      nodes = new Map();
      pathNodesRef.current = nodes;
    }
    for (const drawing of drawings) {
      let node = nodes.get(drawing.id);
      if (!node) {
        node = {
          ribbon: svg.querySelector(`[data-path="${CSS.escape(drawing.id)}"] [data-ribbon]`),
          hit: svg.querySelector(`[data-testid="${CSS.escape(`village-path-${drawing.id}`)}"]`),
        };
        nodes.set(drawing.id, node);
      }
      if (node.ribbon && node.ribbon.getAttribute("d") !== drawing.ribbon) {
        node.ribbon.setAttribute("d", drawing.ribbon);
      }
      const chain = openChain(drawing.points);
      if (node.hit && node.hit.getAttribute("d") !== chain) node.hit.setAttribute("d", chain);
    }
  };

  const onPathPointerMove = (event: ReactPointerEvent<SVGPathElement>) => {
    const drag = pathDragRef.current;
    if (!drag) return;
    const point = toSvg(event);
    const next = constrainVillagePath(
      pathField,
      drag.id,
      { x: point.x + drag.dx, y: point.y + drag.dy },
      pathOverrides,
    );
    pendingPathRef.current = next;
    previewPath(drag.id, next);
  };

  const finishPathDrag = () => {
    const drag = pathDragRef.current;
    const point = pendingPathRef.current;
    pathDragRef.current = null;
    pendingPathRef.current = null;
    onActiveLabel(null);
    if (drag && point) onPathOverride(drag.id, point);
  };

  const onTreePointerDown = (event: ReactPointerEvent<SVGGElement>, tree: MapTree) => {
    if (readOnly || !onMoveTree) return;
    event.stopPropagation();
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail for a synthetic event. The drag still tracks on the crown.
    }
    const point = toSvg(event);
    treeDragRef.current = { id: tree.id, dx: tree.x - point.x, dy: tree.y - point.y };
    onActiveLabel(treeVariant(tree.variant)?.label ?? "Tree");
  };

  const onTreePointerMove = (event: ReactPointerEvent<SVGGElement>) => {
    const drag = treeDragRef.current;
    if (!drag || !onMoveTree) return;
    const point = toSvg(event);
    const next = snapToPixel({ x: point.x + drag.dx, y: point.y + drag.dy });
    pendingTreeRef.current = next;
    event.currentTarget.setAttribute("transform", `translate(${next.x} ${next.y})`);
  };

  const finishTreeDrag = () => {
    const drag = treeDragRef.current;
    const point = pendingTreeRef.current;
    treeDragRef.current = null;
    pendingTreeRef.current = null;
    onActiveLabel(null);
    if (drag && point && onMoveTree) onMoveTree(drag.id, point);
  };

  const onMapPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (readOnly || !placingTree || !onPlaceTree || event.detail > 1) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const ground = target.getAttribute("data-ground");
    if (ground !== "interior" && ground !== "outside") return;
    onPlaceTree(snapToPixel(toSvg(event)));
  };

  const onPalisadeEnter = () => {
    onHoverBuilding?.("palisades");
  };
  const onPalisadeLeave = () => {
    onHoverBuilding?.(null);
  };
  const innerInk = VILLAGE_INK_GAP;
  const outerInk = PALISADE_BORDER;
  const palisadeInkPath =
    build.wall > 0
      ? smoothClosedPath(outsetFromCenter(outline, (outerInk - innerInk) / 2))
      : outlinePath;
  const palisadeInkWidth = thickness + innerInk + outerInk;

  const chitinColor = tuning.chitin;

  return (
    <MapInkContext.Provider value={tuning.ink}>
      <MapHoverRingContext.Provider value={true}>
        <svg
          ref={svgRef}
          data-testid="village-map"
          viewBox={viewBox}
          className={`h-full w-full touch-none select-none${placingTree && onPlaceTree ? " cursor-crosshair" : ""}`}
          role="img"
          aria-label="Top-down village"
          onPointerDown={onMapPointerDown}
        >
          <defs>
            {/* Empty on purpose. Fade masks portal here so the building opacity does not fade the mask. */}
            <defs ref={setMaskHost} />
            <OutlineWobbleFilter />
            <filter
              id={treeWobbleId}
              filterUnits="objectBoundingBox"
              primitiveUnits="userSpaceOnUse"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence type="fractalNoise" baseFrequency={0.09} numOctaves={1} seed={4} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.15} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            {build.wall > 0 ? (
              <mask
                id={wallMaskId}
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x={frameX}
                y={frameY}
                width={frameSize}
                height={frameSize}
              >
                <path
                  d={outlinePath}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </mask>
            ) : null}
          </defs>
          <rect data-ground="outside" x={frameX} y={frameY} width={frameSize} height={frameSize} fill={tuning.ground} />

          <path
            data-ground="interior"
            d={groundPath}
            fill={tuning.interior}
            fillOpacity={tuning.interiorOpacity}
            filter={VILLAGE_OUTLINE_WOBBLE}
          />

          {paths.length > 0 ? (
            <g data-testid="village-paths">
              <defs>
                <clipPath id={pathClipId}>
                  {paths.map((path) => (
                    <path key={path.id} d={path.ribbon} />
                  ))}
                </clipPath>
                <filter
                  id={pathOutlineFilterId}
                  filterUnits="objectBoundingBox"
                  primitiveUnits="userSpaceOnUse"
                  x="-4%"
                  y="-4%"
                  width="108%"
                  height="108%"
                  colorInterpolationFilters="sRGB"
                >
                  <feTurbulence type="fractalNoise" baseFrequency={0.16} numOctaves={1} seed={4} result="noise" />
                  <feDisplacementMap
                    in="SourceAlpha"
                    in2="noise"
                    scale={PATH_OUTLINE_WOBBLE}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="wobbled"
                  />
                  <feMorphology in="wobbled" operator="dilate" radius={PATH_OUTLINE_RADIUS} result="grown" />
                  <feComposite in="grown" in2="wobbled" operator="out" result="ring" />
                  <feFlood floodColor={tuning.ink} result="ink" />
                  <feComposite in="ink" in2="ring" operator="in" />
                </filter>
                <mask
                  id={pathDoorMaskId}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x={frameX}
                  y={frameY}
                  width={frameSize}
                  height={frameSize}
                >
                  <rect x={frameX} y={frameY} width={frameSize} height={frameSize} fill="#fff" />
                  {paths.map((path, index) =>
                    path.doorFade ? (
                      <path
                        key={path.id}
                        d={path.ribbon}
                        fill={`url(#${pathFadeId}-outline-${index})`}
                        stroke={`url(#${pathFadeId}-outline-${index})`}
                        strokeWidth={PATH_OUTLINE_FADE_STROKE}
                        strokeLinejoin="round"
                      />
                    ) : null,
                  )}
                </mask>
                <mask
                  id={pathHeartMaskId}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x={frameX}
                  y={frameY}
                  width={frameSize}
                  height={frameSize}
                >
                  <rect x={frameX} y={frameY} width={frameSize} height={frameSize} fill="#fff" />
                  {paths.map((path, index) =>
                    path.heartFade ? (
                      <path
                        key={path.id}
                        d={path.ribbon}
                        fill={`url(#${pathFadeId}-heart-${index})`}
                        stroke={`url(#${pathFadeId}-heart-${index})`}
                        strokeWidth={PATH_OUTLINE_FADE_STROKE}
                        strokeLinejoin="round"
                      />
                    ) : null,
                  )}
                </mask>
                {paths.map((path, index) =>
                  path.doorFade ? (
                    <linearGradient
                      key={path.id}
                      id={`${pathFadeId}-outline-${index}`}
                      gradientUnits="userSpaceOnUse"
                      x1={path.doorFade.from.x}
                      y1={path.doorFade.from.y}
                      x2={path.doorFade.to.x}
                      y2={path.doorFade.to.y}
                    >
                      <stop offset="0" stopColor="#000" />
                      <stop offset={path.doorFade.clear} stopColor="#000" />
                      <stop offset="1" stopColor="#fff" />
                    </linearGradient>
                  ) : null,
                )}
                {paths.map((path, index) =>
                  path.heartFade ? (
                    <linearGradient
                      key={`heart-${path.id}`}
                      id={`${pathFadeId}-heart-${index}`}
                      gradientUnits="userSpaceOnUse"
                      x1={path.heartFade.from.x}
                      y1={path.heartFade.from.y}
                      x2={path.heartFade.to.x}
                      y2={path.heartFade.to.y}
                    >
                      <stop offset="0" stopColor="#000" />
                      <stop offset={path.heartFade.clear} stopColor="#000" />
                      <stop offset="1" stopColor="#fff" />
                    </linearGradient>
                  ) : null,
                )}
              </defs>
              <g opacity={PATH_GRAVEL_OPACITY}>
                {paths.map((path, index) => {
                  const waiting = pathWaitsForBuilding(path, reveal);
                  const fades = [path.doorFade, path.heartFade].filter((fade): fade is PathFade => fade != null);
                  return (
                    <g
                      key={path.id}
                      data-path={path.id}
                      className={waiting ? "village-map-path-after-building" : undefined}
                      onAnimationEnd={(event) => {
                        if (event.animationName !== "village-map-path-in") return;
                        setPathReady((current) =>
                          current[path.id] ? current : { ...current, [path.id]: true },
                        );
                      }}
                    >
                      <PathEndFades
                        fades={fades}
                        idPrefix={`${pathFadeId}-${index}`}
                        frame={{ x: frameX, y: frameY, size: frameSize }}
                      >
                        <path data-ribbon="" d={path.ribbon} fill={trackFill} />
                        <g clipPath={`url(#${pathClipId})`}>
                          {path.stones.map((stone, stoneIndex) => (
                            <path
                              key={stoneIndex}
                              d={stone.d}
                              fill={stone.tone === 0 ? stoneDark : stoneMid}
                            />
                          ))}
                        </g>
                      </PathEndFades>
                    </g>
                  );
                })}
              </g>
              <g mask={`url(#${pathDoorMaskId})`} style={{ pointerEvents: "none" }}>
                <g mask={`url(#${pathHeartMaskId})`}>
                  <g filter={`url(#${pathOutlineFilterId})`} opacity={PATH_OUTLINE_OPACITY}>
                    {paths.map((path) => {
                      const waiting = pathWaitsForBuilding(path, reveal);
                      return (
                        <path
                          key={`outline-${path.id}`}
                          d={path.ribbon}
                          fill="#000"
                          className={waiting ? "village-map-path-after-building" : undefined}
                        />
                      );
                    })}
                  </g>
                </g>
              </g>
              {paths.map((path) => {
                const waiting = pathWaitsForBuilding(path, reveal);
                const interactive = !readOnly && (!waiting || pathReady[path.id] === true);
                return (
                  <path
                    key={`hit-${path.id}`}
                    data-testid={`village-path-${path.id}`}
                    d={openChain(path.points)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    style={{
                      cursor: interactive ? "grab" : "default",
                      pointerEvents: interactive ? "stroke" : "none",
                    }}
                    onPointerDown={interactive ? (event) => onPathPointerDown(event, path) : undefined}
                    onPointerMove={interactive ? onPathPointerMove : undefined}
                    onPointerUp={interactive ? finishPathDrag : undefined}
                    onPointerCancel={interactive ? finishPathDrag : undefined}
                    onDoubleClick={
                      interactive
                        ? (event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          onPathOverride(path.id, null);
                        }
                        : undefined
                    }
                  />
                );
              })}
            </g>
          ) : null}

          {moatBand && moatPoints ? (
            <g
              data-building="fortifiedMoat"
              style={{ cursor: "default" }}
              onPointerEnter={() => {
                onHoverBuilding?.("fortifiedMoat");
              }}
              onPointerLeave={() => {
                onHoverBuilding?.(null);
              }}
            >
              <defs>
                <clipPath id={moatClipId}>
                  <path d={moatBand} clipRule="evenodd" />
                </clipPath>
              </defs>
              <path
                d={moatBand}
                fill={tuning.waterFill}
                fillOpacity={0.65}
                fillRule="evenodd"
                stroke="#000"
                strokeWidth={1}
                strokeLinejoin="round"
              />
              <g
                clipPath={`url(#${moatClipId})`}
                filter={VILLAGE_STROKE_WOBBLE}
                fill="none"
                stroke={tuning.water}
                strokeWidth={HATCH_WIDTH}
                strokeOpacity={0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {moatHatchPaths(moatPoints, tuning.wallOval).map((d, index) => (
                  <path key={index} d={d} />
                ))}
              </g>
              <SilhouetteHighlight stroke={1}>
                <path d={moatBand} fill="#000" fillRule="evenodd" />
              </SilhouetteHighlight>
            </g>
          ) : null}

          {trees.length > 0 ? (
            <g data-testid="map-trees" opacity={0.8}>
              {trees.map((tree) => {
                if (concealedTrees.has(tree.id)) return null;
                const variant = treeVariant(tree.variant);
                if (!variant) return null;
                const movable = !readOnly && onMoveTree != null;
                return (
                  <g
                    key={tree.id}
                    data-testid={`map-tree-${tree.variant}`}
                    transform={`translate(${tree.x} ${tree.y}) rotate(${tree.turn}) scale(${treeDrawScale(tree)})`}
                    style={{ cursor: movable ? "grab" : "default" }}
                    onPointerDown={movable ? (event) => onTreePointerDown(event, tree) : undefined}
                    onPointerMove={movable ? onTreePointerMove : undefined}
                    onPointerUp={movable ? finishTreeDrag : undefined}
                    onPointerCancel={movable ? finishTreeDrag : undefined}
                    onDoubleClick={
                      readOnly || !onRemoveTree
                        ? undefined
                        : (event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          onRemoveTree(tree.id);
                        }
                    }
                  >
                    <TreeMark variant={variant} ink={tuning.ink} fill={tuning.fill} filterId={treeWobbleId} />
                  </g>
                );
              })}
            </g>
          ) : null}

          {wallChitinPaths.length > 0 ? (
            <g data-testid="chitin-plating" filter={OUTLINE_WOBBLE}>
              {wallChitinPaths.map((d, index) => (
                <ChitinRibbon key={`wall-chitin-${index}`} d={d} color={chitinColor} />
              ))}
            </g>
          ) : null}

          {chitinBoundary
            ? (
              <g data-testid="palisade-chitin" filter={OUTLINE_WOBBLE}>
                {towers.flatMap((tower, index) =>
                  polyOutsideChitinPaths(
                    palisadeTowerRim(tower, palisadeTowerChitinOutset(CHITIN_STROKE)),
                    chitinBoundary,
                  ).map((d, pathIndex) => (
                    <ChitinRibbon
                      key={`palisade-chitin-${index}-${pathIndex}`}
                      d={d}
                      color={chitinColor}
                    />
                  )),
                )}
              </g>
            )
            : null}

          {fortChitin.length > 0 ? (
            <g data-testid="fort-chitin" filter={OUTLINE_WOBBLE}>
              {fortChitin.map((path) => (
                <ChitinRibbon key={path.key} d={path.d} color={chitinColor} />
              ))}
            </g>
          ) : null}

          {chitinSpikes.length > 0 ? (
            <g data-testid="chitin-spikes" filter={OUTLINE_WOBBLE}>
              {chitinSpikes.map((spike, index) => (
                <polygon
                  key={`chitin-spike-${index}`}
                  points={`${spike.left.x.toFixed(2)},${spike.left.y.toFixed(2)} ${spike.right.x.toFixed(2)},${spike.right.y.toFixed(2)} ${spike.tip.x.toFixed(2)},${spike.tip.y.toFixed(2)}`}
                  fill={chitinColor}
                  stroke="#000"
                  strokeWidth={CHITIN_OUTLINE * 2}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                />
              ))}
            </g>
          ) : null}

          {showWall || towers.length > 0 ? (
            <g
              data-building={build.wall > 0 ? "palisades" : undefined}
              style={build.wall > 0 ? { cursor: "default" } : undefined}
              onPointerEnter={build.wall > 0 ? onPalisadeEnter : undefined}
              onPointerLeave={build.wall > 0 ? onPalisadeLeave : undefined}
            >
              {showWall ? (
                <g opacity={build.wall === 0 ? 0.35 : 1}>
                  <g filter={VILLAGE_STROKE_WOBBLE}>
                    {build.wall > 0 ? (
                      <path
                        d={palisadeInkPath}
                        fill="none"
                        stroke={tuning.ink}
                        strokeWidth={palisadeInkWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    <path
                      d={outlinePath}
                      fill="none"
                      stroke={tuning.wallColor}
                      strokeWidth={thickness}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={build.wall === 0 ? "7 8" : undefined}
                    />
                    {build.wall > 0 ? (
                      <g mask={`url(#${wallMaskId})`} style={{ pointerEvents: "none" }}>
                        <g
                          transform={`translate(${MAP_CENTER} ${MAP_CENTER})`}
                          fill="none"
                          stroke={tuning.ink}
                          strokeWidth={CROSSED_HATCH_WIDTH}
                          strokeOpacity={0.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {wallHatch.map((d, index) => (
                            <path key={index} d={d} />
                          ))}
                        </g>
                      </g>
                    ) : null}
                  </g>
                  {build.wall > 0 ? (
                    <SilhouetteHighlight stroke={PALISADE_BORDER}>
                      <path
                        d={outlinePath}
                        fill="none"
                        stroke="#000"
                        strokeWidth={thickness}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </SilhouetteHighlight>
                  ) : null}
                </g>
              ) : null}
              <g data-testid="palisade-towers">
                <g filter={OUTLINE_WOBBLE}>
                  {towers.map((tower, index) => (
                    <g key={`palisade-tower-${index}`}>
                      <circle cx={tower.x} cy={tower.y} r={tower.r} fill={tuning.fill} />
                      <circle
                        cx={tower.x}
                        cy={tower.y}
                        r={tower.r}
                        fill="none"
                        stroke={tuning.ink}
                        strokeWidth={PALISADE_TOWER_STROKE}
                      />
                    </g>
                  ))}
                </g>
                {towers.map((tower, index) => (
                  <circle
                    key={`palisade-tower-hot-${index}`}
                    className="village-map-hover-ring"
                    cx={tower.x}
                    cy={tower.y}
                    r={tower.r}
                    fill="none"
                    stroke="#000"
                    strokeWidth={PALISADE_TOWER_STROKE + MAP_HIGHLIGHT_BORDER}
                  />
                ))}
              </g>
            </g>
          ) : null}

          {slots.map((slot) => {
            const fadeSignature = revealFadeSignature(reveal, slot.id);
            const fading =
              fadeSignature != null &&
              easedBorder[slot.id] !== fadeSignature &&
              !prefersReducedMotion();
            const fixed = readOnly || staysPut(slot.buildingId);
            return (
              <g
                key={slot.id}
                data-building={slot.buildingId}
                data-slot={slot.id}
                transform={`translate(${slot.x} ${slot.y})`}
                style={{ cursor: fixed ? "default" : "grab" }}
                onPointerDown={
                  fixed
                    ? undefined
                    : (event) => {
                      draggingSlotRef.current = slot.id;
                      event.currentTarget.classList.add("is-dragging");
                      onHoverBuilding?.(null);
                      onPointerDown(event, slot);
                    }
                }
                onPointerMove={readOnly ? undefined : onPointerMove}
                onPointerUp={readOnly ? undefined : (event) => finishSlotDrag(event.currentTarget)}
                onPointerCancel={readOnly ? undefined : (event) => finishSlotDrag(event.currentTarget)}
                onDoubleClick={
                  readOnly
                    ? undefined
                    : (event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      onOverride(slot.id, null);
                    }
                }
                onPointerEnter={() => {
                  onActiveLabel(slot.label);
                  onHoverBuilding?.(slot.buildingId);
                }}
                onPointerLeave={() => {
                  onActiveLabel(null);
                  onHoverBuilding?.(null);
                }}
              >
                {onHoverBuilding ? null : <title>{slot.label}</title>}
                {reveal?.fadeOutTier[slot.id] != null ? (
                  <g className="village-map-fade-out">
                    <SlotMark
                      slot={slot}
                      tier={reveal.fadeOutTier[slot.id]}
                      tuning={markTuning}
                      heartfireLevel={heartfireLevel}
                      ebonGrace={build.ebonGrace}
                      brimstoneInfusion={build.brimstoneInfusion}
                      dedication={build.dedication}
                      dedicationDeepened={build.dedicationDeepened}
                    />
                  </g>
                ) : null}
                <g
                  className={
                    reveal?.fadeIn[slot.id]
                      ? reveal.fadeOutTier[slot.id] != null
                        ? "village-map-fade-in village-map-fade-in--after-out"
                        : "village-map-fade-in"
                      : undefined
                  }
                  onAnimationEnd={(event) => {
                    if (event.animationName !== "village-map-highlight-fade") return;
                    if (event.elapsedTime < 3 || fadeSignature == null) return;
                    setEasedBorder((current) =>
                      current[slot.id] === fadeSignature ? current : { ...current, [slot.id]: fadeSignature },
                    );
                  }}
                >
                  <SlotMark
                    slot={slot}
                    tier={slot.tier}
                    tuning={markTuning}
                    highlighted={fading}
                    fadeHighlight={fading}
                    heartfireLevel={heartfireLevel}
                    ebonGrace={build.ebonGrace}
                    brimstoneInfusion={build.brimstoneInfusion}
                    dedication={build.dedication}
                    dedicationDeepened={build.dedicationDeepened}
                    drawbridge={drawbridgeBySlot.get(slot.id) ?? null}
                    hatchReach={wallReach}
                  />
                </g>
                {tuning.showNames ? (
                  <text
                    y={tuning.squareSize / 2 + 12}
                    textAnchor="middle"
                    fill="#b7b1a6"
                    fontSize="11"
                    fontFamily="Fira Sans, sans-serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {slot.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {traps.length > 0 ? (
            <g
              data-building="traps"
              style={{ cursor: "default" }}
              onPointerEnter={() => {
                onHoverBuilding?.("traps");
              }}
              onPointerLeave={() => {
                onHoverBuilding?.(null);
              }}
            >
              {traps.map((trap, index) => (
                <g
                  key={`trap-${index}`}
                  transform={`translate(${trap.x} ${trap.y}) rotate(${(Math.sin(index * 2.17) * 10).toFixed(1)})`}
                >
                  <g filter={OUTLINE_WOBBLE} style={{ pointerEvents: "none" }}>
                    <TrapMark
                      size={trapSize}
                      stroke={trapStroke}
                      color={tuning.trapColor}
                      improved={improved}
                    />
                  </g>
                  <circle r={trapTarget} fill="#000" fillOpacity={0} pointerEvents="all" />
                </g>
              ))}
            </g>
          ) : null}
        </svg>
      </MapHoverRingContext.Provider>
    </MapInkContext.Provider>
  );
});

function VillageMapHighlight({
  svgRef,
  highlightId,
}: {
  svgRef: RefObject<SVGSVGElement>;
  highlightId: string | null;
}) {
  useLayoutEffect(() => {
    applyBuildingHighlight(svgRef.current, highlightId);
  }, [svgRef, highlightId]);
  return null;
}

export function VillageMap({ highlightId, ...props }: VillageMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const highlightRef = useRef<string | null>(highlightId);
  highlightRef.current = highlightId;
  const [maskHost, setMaskHost] = useState<SVGDefsElement | null>(null);
  return (
    <MapMaskHostContext.Provider value={maskHost}>
      <VillageMapSvg {...props} svgRef={svgRef} highlightRef={highlightRef} setMaskHost={setMaskHost} />
      <VillageMapHighlight svgRef={svgRef} highlightId={highlightId} />
    </MapMaskHostContext.Provider>
  );
}
