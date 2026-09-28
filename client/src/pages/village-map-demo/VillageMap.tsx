import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { VillageMapReveal } from "@/game/villageMapReveal";
import { BUILDINGS, MAP_CENTER, type BuildState, type Tuning } from "@/pages/village-map-demo/catalog";
import {
  ringPoints,
  outsetFromCenter,
  smoothClosedPath,
  trapPoints,
  trapWallOutset,
  trapsClearOfBuildings,
  layoutWallRadius,
  palisadeTowers,
  wallStrokeWidth,
  moatCenterRadius,
  moatRingPoints,
  MOAT_STROKE,
  moatOuterOffset,
  TRAP_DRAW_SCALE,
  trapMarkScale,
  mapFramePoints,
  fittedViewBox,
  WALL_CHITIN_STROKE,
  pitOutline,
  pitScale,
  pitContourScales,
  storageBorder,
  storageScale,
  storageTowers,
  blacksmithFurnace,
  blacksmithOutline,
  blacksmithScale,
  cabinOutline,
  cabinTower,
  tanneryOutline,
  tradeOutline,
  tradeCircles,
  altarOutline,
  altarCircles,
  alchemistHall,
  clerksHut,
  archiveOutline,
  buildersOutline,
  foundryOutline,
  coinhouseLayout,
  placedSlots,
  containSlots,
  constrainMove,
  staysPut,
  markSize,
  watchtowerOutline,
  watchtowerWidth,
  tentOutline,
  crossOutline,
  ESTATE_LENGTH,
  ESTATE_DEPTH,
  ESTATE_BORDER,
  BASTION_LENGTH,
  BASTION_DEPTH,
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
  estateCornerOctagons,
  estateOuterOctagon,
  wizardTowerOutline,
  wallChitinPolygon,
  wallChitinOpenPaths,
  wallChitinOpenChains,
  chitinSpikesAlongPolyline,
  circleChitinArcPath,
  circleChitinArcPoints,
  bastionChitinPaths,
  bastionChitinChains,
  watchtowerChitinPaths,
  watchtowerChitinChains,
  type PlacedSlot,
  type Point,
  type ChitinSpike,
  type ChitinBlocker,
  type WallChitinSpan,
} from "@/pages/village-map-demo/geometry";

type MarkTuning = Pick<Tuning, "fill" | "borderColor" | "borderWidth">;

/** Extra stroke so a highlight grows 1px into the building and 1px past the border. */
const MAP_HIGHLIGHT_BORDER = 2;
const MapBorderExtraContext = createContext(0);

function useMapBorderExtra(): number {
  return useContext(MapBorderExtraContext);
}

function useOutlineRing(stroke: number, strokeLinejoin: "miter" | "round" = "miter") {
  return {
    fill: "none" as const,
    stroke: "#000",
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
 * Black ring around the union of these fills: 1px into the shape and 1px past
 * its existing outline. Inner strokes are not part of the union, so they stay thin.
 */
function SilhouetteHighlight({
  stroke,
  color = "#000",
  children,
}: {
  stroke: number;
  color?: string;
  children: ReactNode;
}) {
  const extra = useMapBorderExtra();
  const id = `map-hl-${useId().replace(/:/g, "")}`;
  if (extra <= 0) return null;
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
          <feMorphology in="SourceAlpha" operator="dilate" radius={stroke + extra / 2} result="grow" />
          <feMorphology in="SourceAlpha" operator="erode" radius={extra / 2} result="shrink" />
          <feComposite in="grow" in2="shrink" operator="out" result="ring" />
          <feFlood floodColor={color} result="ink" />
          <feComposite in="ink" in2="ring" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} style={{ pointerEvents: "none" }}>
        {cloneMark(children, "hl")}
      </g>
    </>
  );
}

/** Strokes sit under the fills, so seams inside the building stay covered. The highlight rings the outer silhouette only. */
function BorderStack({
  rings,
  fills,
  outline,
  stroke = 1,
}: {
  rings: ReactNode;
  fills: ReactNode;
  /** Fills that form the outer silhouette. Defaults to every fill. */
  outline?: ReactNode;
  stroke?: number;
}) {
  return (
    <g>
      {rings}
      {fills}
      <SilhouetteHighlight stroke={stroke}>{outline ?? fills}</SilhouetteHighlight>
    </g>
  );
}

type Footprint =
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

/** Saturated red for the heartfire stripes. */
const HEARTFIRE_FILL = "#c45454";
/** Saturated blue for the moat stripes. */
const MOAT_COLOR = "#4f9bc4";
/** Gap between 45° hatch lines, in map units. */
const HATCH_GAP = 6;
const HATCH_WIDTH = 1.7;
/** Pillar, monolith, and pale cross. Half the moat stripe width. */
const CROSSED_HATCH_WIDTH = HATCH_WIDTH * 0.5;
/** White rim on the outside edge of the palisade. */
const CHITIN_COLOR = "#ffffff";
/** Shared hand-drawn edge for the wall, moat, and traps. About two user units. */
const OUTLINE_WOBBLE = "url(#building-outline-wobble)";
/** Coarser than the building edge, so a long stroke still reads as a little bent. */
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
}: {
  id: string;
  seed: number;
  frequency: number;
  scale: number;
  xChannel: "R" | "G" | "B";
  yChannel: "R" | "G" | "B";
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
      />
    </filter>
  );
}

function OutlineWobbleFilter() {
  return (
    <>
      <WobbleFilter id="building-outline-wobble" seed={4} frequency={0.16} scale={2.1 * WOBBLE_SCALE} xChannel="R" yChannel="G" />
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
  const outer = maxR + moatOuterOffset() + 10;
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

function hatchReach(points: Point[]): number {
  let reach = 0;
  for (const point of points) reach = Math.max(reach, Math.hypot(point.x, point.y));
  return reach;
}

/** Moat-style stripes, clipped to a building. The outline is redrawn on top so the stroke stays sharp. */
function HatchStripes({
  color,
  reach,
  clip,
  filter,
  crossed = false,
  strokeWidth = HATCH_WIDTH,
  strokeOpacity = 1,
  origin,
}: {
  color: string;
  reach: number;
  clip: ReactNode;
  /** Applied before the clip, so the wave stays inside the shape. */
  filter?: string;
  /** A second set, turned 90°, so the stripes cross. */
  crossed?: boolean;
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
      {crossed
        ? paths.map((d, index) => <path key={`cross-${index}`} d={d} transform="rotate(90)" />)
        : null}
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

function HeartfireMark({ size, fill }: { size: number; fill: string }) {
  const stroke = 1;
  const ring = useOutlineRing(stroke);
  const radius = size / 2;
  return (
    <g>
      <circle r={radius} fill={fill} />
      <HatchStripes
        color={HEARTFIRE_FILL}
        reach={radius}
        clip={<circle r={radius} />}
        filter={outlineWobble("heartfire:0")}
        crossed
      />
      <circle r={radius + stroke / 2} {...ring} />
      <SilhouetteHighlight stroke={stroke}>
        <circle r={radius} fill="#000" />
      </SilhouetteHighlight>
    </g>
  );
}

function outlineWobble(key: string): string {
  return `url(#${wobbleFilterId(key)})`;
}
const CHITIN_STROKE = WALL_CHITIN_STROKE;
/** Black outline on each side of the palisade, the same weight as a building border. */
const PALISADE_BORDER = 1;

const chitinPaint = {
  fill: "none" as const,
  stroke: CHITIN_COLOR,
  strokeWidth: CHITIN_STROKE,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

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
  stroke = "#000",
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
  const ring = { fill: "none" as const, stroke, strokeWidth, strokeLinejoin: "miter" as const };
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
    const outline = watchtowerOutline(size, level);
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
    const points = formatPoints(outline);
    return (
      <g>
        <BorderStack
          stroke={strokeWidth}
          rings={<polygon points={formatPoints(ringPoints)} {...ring} />}
          fills={<polygon points={points} fill={fill} />}
        />
        <HatchStripes color="#000" reach={hatchReach(outline)} clip={<polygon points={points} />} crossed strokeWidth={CROSSED_HATCH_WIDTH} strokeOpacity={0.6} />
        <polygon points={formatPoints(ringPoints)} {...ring} />
      </g>
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
    const length = size * ESTATE_LENGTH;
    const depth = size * ESTATE_DEPTH;
    const pad = strokeWidth / 2;
    const octagons = estateCornerOctagons(size);
    const outer = estateOuterOctagon(size);
    return (
      <g>
        <BorderStack
          stroke={strokeWidth}
          rings={
            <>
              <rect
                x={-length / 2 - pad}
                y={-depth / 2 - pad}
                width={length + strokeWidth}
                height={depth + strokeWidth}
                {...ring}
              />
              {octagons.map((octagon, index) => (
                <polygon key={index} points={formatPoints(offsetPolygon(octagon, pad))} {...ring} />
              ))}
              <polygon points={formatPoints(offsetPolygon(outer, pad))} {...ring} />
            </>
          }
          fills={
            <>
              <rect x={-length / 2} y={-depth / 2} width={length} height={depth} fill={fill} />
              {octagons.map((octagon, index) => (
                <polygon key={`fill-${index}`} points={formatPoints(octagon)} fill={fill} />
              ))}
              <polygon points={formatPoints(outer)} fill={fill} />
            </>
          }
        />
      </g>
    );
  }
  const width = shape === "longhouse" ? size * LONGHOUSE_LENGTH : shape === "hut" ? size * HUT_LENGTH : size;
  const corner = shape === "rounded" ? size * 0.22 : 0;
  return (
    <BorderStack
      stroke={strokeWidth}
      rings={
        <rect
          x={-width / 2 - outset}
          y={-size / 2 - outset}
          width={width + strokeWidth}
          height={size + strokeWidth}
          rx={corner + outset}
          ry={corner + outset}
          {...ring}
        />
      }
      fills={
        <rect
          x={-width / 2}
          y={-size / 2}
          width={width}
          height={size}
          rx={corner}
          ry={corner}
          fill={fill}
        />
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
              if (tower.kind === "round") {
                return <circle key={index} cx={tower.x} cy={tower.y} r={tower.r + outset} {...ring} />;
              }
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
              if (tower.kind === "round") {
                return <circle key={`fill-${index}`} cx={tower.x} cy={tower.y} r={tower.r} fill={fill} />;
              }
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

function BuildersMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = buildersOutline(size, level);
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

function FoundryMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = foundryOutline(size, level);
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
  const points = formatPoints(outline);
  const ringPoints = formatPoints(offsetPolygon(outline, stroke / 2));
  return (
    <g>
      <BorderStack
        rings={<polygon points={ringPoints} {...ring} />}
        fills={<polygon points={points} fill={fill} />}
      />
      <HatchStripes color="#000" reach={hatchReach(outline)} clip={<polygon points={points} />} crossed strokeWidth={CROSSED_HATCH_WIDTH} strokeOpacity={0.6} />
      <polygon points={ringPoints} {...ring} />
    </g>
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

function AltarMark({
  size,
  level,
  fill,
}: {
  size: number;
  level: number;
  fill: string;
}) {
  const outline = altarOutline(size, level);
  const circles = altarCircles(size, level);
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
              <circle key={index} cx={circle.x} cy={circle.y} r={circle.r + outset} {...ring} />
            ))}
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            {circles.map((circle, index) => (
              <circle key={`fill-${index}`} cx={circle.x} cy={circle.y} r={circle.r} fill={fill} />
            ))}
          </>
        }
      />
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
  const stroke = 1;
  const outset = stroke / 2;
  const ring = useOutlineRing(stroke);
  return (
    <g>
      <BorderStack
        rings={
          <>
            <polygon points={formatPoints(offsetPolygon(outline, outset))} {...ring} />
            <rect
              x={furnace.x - furnace.w / 2 - outset}
              y={furnace.y - furnace.h / 2 - outset}
              width={furnace.w + stroke}
              height={furnace.h + stroke}
              {...ring}
            />
          </>
        }
        fills={
          <>
            <polygon points={formatPoints(outline)} fill={fill} />
            <rect
              x={furnace.x - furnace.w / 2}
              y={furnace.y - furnace.h / 2}
              width={furnace.w}
              height={furnace.h}
              fill={fill}
            />
          </>
        }
      />
    </g>
  );
}

/** Solid outer shape of the coinhouse wall, so the house inside is not part of the highlight. */
function coinhouseOuterFill(layout: ReturnType<typeof coinhouseLayout>): ReactNode {
  let maxX = 0;
  let maxY = 0;
  for (const rect of layout.walls) {
    maxX = Math.max(maxX, Math.abs(rect.x) + rect.w / 2);
    maxY = Math.max(maxY, Math.abs(rect.y) + rect.h / 2);
  }
  const gate = layout.gate;
  return (
    <>
      <rect x={-maxX} y={-maxY} width={maxX * 2} height={maxY * 2} fill="#000" />
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
  const rects = [...layout.walls, ...(layout.gate ? [layout.gate] : [])];
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
            {rects.map((rect, index) => (
              <rect
                key={`wall-${index}`}
                x={rect.x - rect.w / 2 - outset}
                y={rect.y - rect.h / 2 - outset}
                width={rect.w + stroke}
                height={rect.h + stroke}
                {...ring}
              />
            ))}
          </>
        }
        fills={
          <>
            <rect x={-layout.house.w / 2} y={-layout.house.h / 2} width={layout.house.w} height={layout.house.h} fill={fill} />
            {layout.octagons.map((octagon, index) => (
              <polygon key={`oct-fill-${index}`} points={formatPoints(octagon)} fill={fill} />
            ))}
            {rects.map((rect, index) => (
              <rect
                key={`wall-fill-${index}`}
                x={rect.x - rect.w / 2}
                y={rect.y - rect.h / 2}
                width={rect.w}
                height={rect.h}
                fill={fill}
              />
            ))}
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
}: {
  size: number;
  tier: number;
  tuning: MarkTuning;
  shape?: Footprint;
  buildingId?: string;
}) {
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
    const stroke = 1;
    const radius = size / 2;
    return (
      <g>
        <BuildingFootprint size={size} shape="round" fill={tuning.fill} strokeWidth={stroke} />
        <HatchStripes color="#000" reach={radius} clip={<circle r={radius} />} crossed strokeWidth={CROSSED_HATCH_WIDTH} strokeOpacity={0.6} />
        <circle r={radius + stroke / 2} fill="none" stroke="#000" strokeWidth={stroke} />
      </g>
    );
  }
  if (buildingId === "boneTemple") {
    return <BoneTempleMark size={size} fill={tuning.fill} />;
  }
  if (buildingId === "trade") {
    return <TradeMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "altar") {
    return <AltarMark size={size} level={level} fill={tuning.fill} />;
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
    return <FoundryMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "coinhouse") {
    return <CoinhouseMark size={size} level={level} fill={tuning.fill} />;
  }
  if (buildingId === "heartfire") {
    return <HeartfireMark size={size} fill={tuning.fill} />;
  }
  if (shape === "estate") {
    return (
      <BuildingFootprint
        size={size}
        shape="estate"
        fill={tuning.fill}
        strokeWidth={level > 1 ? ESTATE_BORDER : 1}
        stroke={level > 1 ? "#111" : "#000"}
        level={level}
      />
    );
  }
  if (shape === "pit") {
    const grown = size * pitScale(level);
    return (
      <g>
        <path d={smoothClosedPath(pitOutline(grown))} fill={tuning.fill} stroke="#000" strokeWidth={1} />
        <SilhouetteHighlight stroke={1}>
          <path d={smoothClosedPath(pitOutline(grown))} fill="#000" />
        </SilhouetteHighlight>
        {pitContourScales(level).map((scale) => (
          <path
            key={scale}
            d={smoothClosedPath(pitOutline(grown * scale))}
            fill="none"
            stroke="#2c2824"
            strokeOpacity={0.5}
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
      strokeWidth={shape === "bastion" ? level * 4 : shape === "watchtower" ? 4 : 1}
      outwardBorder={!special}
      level={level}
    />
  );
  if (shape === "cross" && level > 1) {
    const stroke = Math.min((level - 1) * tuning.borderWidth, size * 0.12);
    return (
      <g transform="rotate(180)">
        <polygon
          points={formatPoints(crossOutline(size))}
          fill="none"
          stroke={tuning.borderColor}
          strokeWidth={stroke}
          strokeLinejoin="miter"
        />
        {fill}
      </g>
    );
  }
  return fill;
}

/** Buildings with their own drawing. */
const UPGRADE_RULES = new Set(["storage", "pit", "watchtower", "estate", "paleCross", "blacksmith", "cabin", "tannery", "alchemistHall", "clerksHut", "archive", "builders", "foundry", "timberMill", "trade", "altar", "coinhouse", "boneTemple"]);

const UPGRADE_ICON_SIZE: Record<string, number> = {
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
  builders: 6,
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

/** Row-icon sizes were fitted to ±34. The Look frame is ±40. */
const LOOK_MARK_SCALE = 40 / 34;

export function LookEvolutions({ tuning }: { tuning: MarkTuning }) {
  const buildings = BUILDINGS.filter(
    (building) => building.names.length > 1 || UPGRADE_RULES.has(building.id),
  );
  return (
    <div className="space-y-4">
      {buildings.map((building) => {
        const size = (UPGRADE_ICON_SIZE[building.id] ?? 16) * LOOK_MARK_SCALE;
        return (
          <div key={building.id}>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
              {building.names[0]}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {building.names.map((name, index) => (
                <div key={name} className="flex flex-col items-center gap-1">
                  <svg width="72" height="72" viewBox="-40 -40 80 80" aria-hidden>
                    <g transform={upgradeIconTurn(building.id)} filter={outlineWobble(`${building.id}:${index}`)}>
                      <BuildingMark
                        buildingId={building.id}
                        size={size}
                        tier={index + 1}
                        tuning={tuning}
                        shape={footprintOf(building.id)}
                      />
                    </g>
                  </svg>
                  <span className="text-center text-[10px] leading-tight text-stone-500">{name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const highlighted = useMapBorderExtra() > 0;
  const arms = () => (
    <>
      <line x1={-size} y1={-size} x2={size} y2={size} />
      <line x1={-size} y1={size} x2={size} y2={-size} />
    </>
  );
  return (
    <g strokeLinecap="square">
      {highlighted ? (
        <g fill="none" stroke="#fff" strokeWidth={stroke + MAP_HIGHLIGHT_BORDER}>
          {arms()}
          {improved ? <circle r={0.85 + MAP_HIGHLIGHT_BORDER / 2} fill="#fff" stroke="none" /> : null}
        </g>
      ) : null}
      <g fill="none" stroke={color} strokeWidth={stroke}>
        {arms()}
        {improved ? <circle r={0.85} fill={color} stroke="none" /> : null}
      </g>
    </g>
  );
}

function SlotMark({
  slot,
  tier,
  tuning,
  highlighted = false,
}: {
  slot: PlacedSlot;
  tier: number;
  tuning: Tuning;
  highlighted?: boolean;
}) {
  return (
    <MapBorderExtraContext.Provider value={highlighted ? MAP_HIGHLIGHT_BORDER : 0}>
      <g
        transform={markRotation(slot.buildingId, slot)}
        // The heartfire circle stays smooth. Its stripes wobble on their own.
        filter={slot.buildingId === "heartfire" ? undefined : outlineWobble(slot.id)}
      >
        <BuildingMark
          buildingId={slot.buildingId}
          size={
            slot.buildingId === "watchtower"
              ? watchtowerWidth(tuning.squareSize, tier)
              : markSize(slot.buildingId, tuning.squareSize)
          }
          tier={tier}
          tuning={tuning}
          shape={footprintOf(slot.buildingId)}
        />
      </g>
    </MapBorderExtraContext.Provider>
  );
}

export function VillageMap({
  build,
  tuning,
  overrides,
  highlightId,
  onOverride,
  onActiveLabel,
  onHoverBuilding,
  reveal = null,
  readOnly = false,
}: {
  build: BuildState;
  tuning: Tuning;
  overrides: Record<string, Point>;
  highlightId: string | null;
  onOverride: (id: string, point: Point | null) => void;
  onActiveLabel: (label: string | null) => void;
  onHoverBuilding?: (buildingId: string | null) => void;
  reveal?: VillageMapReveal | null;
  readOnly?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [revealHighlight, setRevealHighlight] = useState(
    () => reveal != null && Object.keys(reveal.fadeIn).length > 0,
  );
  useEffect(() => {
    if (!revealHighlight) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealHighlight(false);
    }
  }, [revealHighlight]);
  const moatClipId = `moat-clip-${useId().replace(/:/g, "")}`;
  const wallMaskId = `wall-hatch-${useId().replace(/:/g, "")}`;
  const radius = layoutWallRadius(tuning);
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const slots = containSlots(placedSlots(build, tuning, overrides), radius, tuning, thickness, build.wall);
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
  const moatPoints =
    build.moat && build.wall > 0
      ? moatRingPoints(moatCenterRadius(radius, anchor), tuning)
      : null;
  const moatBand = moatPoints
    ? `${smoothClosedPath(outsetFromCenter(moatPoints, moatOuterOffset()))} ${smoothClosedPath(outsetFromCenter(moatPoints, -MOAT_STROKE / 2))}`
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
            markSize("bastion", tuning.squareSize),
            Math.max(1, slot.tier) * 4,
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
          const width = watchtowerWidth(tuning.squareSize, slot.tier);
          const stroke = 4;
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
          r: tower.r + 0.5 + CHITIN_STROKE / 2,
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
          return bastionChitinPaths(
            slot,
            markSize("bastion", tuning.squareSize),
            Math.max(1, slot.tier) * 4,
            CHITIN_STROKE,
            chitinBoundary,
          ).map((d, index) => ({ key: `${slot.id}-chitin-${index}`, d }));
        }
        if (slot.buildingId === "watchtower") {
          return watchtowerChitinPaths(
            slot,
            watchtowerWidth(tuning.squareSize, slot.tier),
            Math.max(1, slot.tier),
            4,
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
          chitinSpikesAlongPolyline(
            circleChitinArcPoints(tower, tower.r + 0.5 + CHITIN_STROKE / 2, chitinBoundary),
            CHITIN_STROKE,
            { closed: false },
          ),
        ),
        ...slots.flatMap((slot) => {
          if (slot.buildingId === "bastion") {
            return bastionChitinChains(
              slot,
              markSize("bastion", tuning.squareSize),
              Math.max(1, slot.tier) * 4,
              CHITIN_STROKE,
              chitinBoundary,
            ).flatMap((chain) =>
              chitinSpikesAlongPolyline(chain, CHITIN_STROKE, { closed: false, outside: "left" }),
            );
          }
          if (slot.buildingId === "watchtower") {
            return watchtowerChitinChains(
              slot,
              watchtowerWidth(tuning.squareSize, slot.tier),
              Math.max(1, slot.tier),
              4,
              CHITIN_STROKE,
              chitinBoundary,
            ).flatMap((chain) =>
              chitinSpikesAlongPolyline(chain, CHITIN_STROKE, { closed: false }),
            );
          }
          return [];
        }),
      ];
  const traps =
    build.traps > 0
      ? trapsClearOfBuildings(
        trapPoints(
          radius,
          tuning,
          build.traps,
          anchor,
          trapWallOutset(build.wall, thickness, tuning.squareSize, build.chitin ? CHITIN_STROKE : 0),
        ),
        tuning,
        build.traps,
        build.wall,
        radius,
        slots,
      )
      : [];
  const improved = build.traps >= 2;
  const trapScale = trapMarkScale(build.traps);
  const trapSize = tuning.trapSize * TRAP_DRAW_SCALE * trapScale;
  const trapStroke = tuning.trapStroke * TRAP_DRAW_SCALE * trapScale;
  const cityEdge = (build.counts.bastion ?? 0) <= 0 && build.traps <= 0;
  const viewBox = tuning.fitView
    ? fittedViewBox(mapFramePoints(build, tuning, slots), cityEdge ? tuning.squareSize + 16 : tuning.squareSize + 20)
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
    dragRef.current = { id: slot.id, dx: slot.x - point.x, dy: slot.y - point.y };
    onActiveLabel(slot.label);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toSvg(event);
    const moving = slots.find((slot) => slot.id === drag.id);
    if (!moving) return;
    const desired = { x: point.x + drag.dx, y: point.y + drag.dy };
    onOverride(drag.id, constrainMove(moving, desired, slots, radius, tuning, build.wall));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const moatHighlighted =
    highlightId === "fortifiedMoat" || hoveredBuildingId === "fortifiedMoat";
  const trapsHighlighted = highlightId === "traps" || hoveredBuildingId === "traps";

  return (
    <svg
      ref={svgRef}
      data-testid="village-map"
      viewBox={viewBox}
      className="h-full w-full touch-none select-none"
      role="img"
      aria-label="Top-down village"
    >
      <defs>
        <OutlineWobbleFilter />
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
      <rect x={frameX} y={frameY} width={frameSize} height={frameSize} fill={tuning.ground} />

      <path d={outlinePath} fill={tuning.interior} />

      {moatBand && moatPoints ? (
        <MapBorderExtraContext.Provider value={moatHighlighted ? MAP_HIGHLIGHT_BORDER : 0}>
          <g
            data-building="fortifiedMoat"
            style={{ cursor: "default" }}
            onPointerEnter={() => {
              setHoveredBuildingId("fortifiedMoat");
              onHoverBuilding?.("fortifiedMoat");
            }}
            onPointerLeave={() => {
              setHoveredBuildingId((current) =>
                current === "fortifiedMoat" ? null : current,
              );
              onHoverBuilding?.(null);
            }}
          >
            <defs>
              <clipPath id={moatClipId}>
                <path d={moatBand} clipRule="evenodd" />
              </clipPath>
            </defs>
            <path d={moatBand} fill={tuning.fill} fillRule="evenodd" />
            <g
              clipPath={`url(#${moatClipId})`}
              filter={VILLAGE_STROKE_WOBBLE}
              fill="none"
              stroke={MOAT_COLOR}
              strokeWidth={HATCH_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {moatHatchPaths(moatPoints, tuning.wallOval).map((d, index) => (
                <path key={index} d={d} />
              ))}
            </g>
            <SilhouetteHighlight stroke={1} color="#fff">
              <path d={moatBand} fill="#000" fillRule="evenodd" />
            </SilhouetteHighlight>
          </g>
        </MapBorderExtraContext.Provider>
      ) : null}

      {wallChitinPaths.length > 0 ? (
        <g data-testid="chitin-plating" filter={OUTLINE_WOBBLE}>
          {wallChitinPaths.map((d, index) => (
            <path key={`wall-chitin-${index}`} d={d} {...chitinPaint} />
          ))}
        </g>
      ) : null}

      {chitinBoundary
        ? (
          <g data-testid="palisade-chitin" filter={OUTLINE_WOBBLE}>
            {towers.map((tower, index) => {
              const d = circleChitinArcPath(
                tower,
                tower.r + 0.5 + CHITIN_STROKE / 2,
                chitinBoundary,
              );
              return d ? (
                <path key={`palisade-chitin-${index}`} d={d} {...chitinPaint} />
              ) : null;
            })}
          </g>
        )
        : null}

      {fortChitin.length > 0 ? (
        <g data-testid="fort-chitin" filter={OUTLINE_WOBBLE}>
          {fortChitin.map((path) => (
            <path key={path.key} d={path.d} {...chitinPaint} />
          ))}
        </g>
      ) : null}

      {chitinSpikes.length > 0 ? (
        <g data-testid="chitin-spikes" filter={OUTLINE_WOBBLE}>
          {chitinSpikes.map((spike, index) => (
            <polygon
              key={`chitin-spike-${index}`}
              points={`${spike.left.x.toFixed(2)},${spike.left.y.toFixed(2)} ${spike.right.x.toFixed(2)},${spike.right.y.toFixed(2)} ${spike.tip.x.toFixed(2)},${spike.tip.y.toFixed(2)}`}
              fill={CHITIN_COLOR}
            />
          ))}
        </g>
      ) : null}

      {showWall ? (
        <g filter={VILLAGE_STROKE_WOBBLE} opacity={build.wall === 0 ? 0.35 : 1}>
          {build.wall > 0 ? (
            <path
              d={outlinePath}
              fill="none"
              stroke="#000"
              strokeWidth={thickness + PALISADE_BORDER * 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          <path
            d={outlinePath}
            fill="none"
            stroke={tuning.fill}
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
                stroke="#000"
                strokeWidth={CROSSED_HATCH_WIDTH}
                strokeOpacity={0.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {wallHatch.map((d, index) => (
                  <path key={index} d={d} />
                ))}
                {wallHatch.map((d, index) => (
                  <path key={`cross-${index}`} d={d} transform="rotate(90)" />
                ))}
              </g>
            </g>
          ) : null}
        </g>
      ) : null}

      <g data-testid="palisade-towers" filter={OUTLINE_WOBBLE}>
        {towers.map((tower, index) => (
          <g key={`palisade-tower-${index}`}>
            <circle cx={tower.x} cy={tower.y} r={tower.r} fill={tuning.fill} />
            <HatchStripes
              color="#000"
              reach={tower.r}
              origin={{ x: tower.x, y: tower.y }}
              clip={<circle cx={tower.x} cy={tower.y} r={tower.r} />}
              crossed
              strokeWidth={CROSSED_HATCH_WIDTH}
              strokeOpacity={0.6}
            />
            <circle cx={tower.x} cy={tower.y} r={tower.r} fill="none" stroke="#000" strokeWidth={1} />
          </g>
        ))}
      </g>

      {slots.map((slot) => {
        const highlighted =
          (highlightId !== null && highlightId === slot.buildingId) ||
          hoveredBuildingId === slot.buildingId;
        const fixed = readOnly || staysPut(slot.buildingId);
        return (
          <g
            key={slot.id}
            data-building={slot.buildingId}
            transform={`translate(${slot.x} ${slot.y})`}
            style={{ cursor: fixed ? "default" : "grab" }}
            onPointerDown={
              fixed
                ? undefined
                : (event) => {
                  setHoveredBuildingId(null);
                  onHoverBuilding?.(null);
                  onPointerDown(event, slot);
                }
            }
            onPointerMove={readOnly ? undefined : onPointerMove}
            onPointerUp={readOnly ? undefined : onPointerUp}
            onPointerCancel={readOnly ? undefined : onPointerUp}
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
              setHoveredBuildingId(slot.buildingId);
              onActiveLabel(slot.label);
              onHoverBuilding?.(slot.buildingId);
            }}
            onPointerLeave={() => {
              setHoveredBuildingId(null);
              onActiveLabel(null);
              onHoverBuilding?.(null);
            }}
          >
            {onHoverBuilding ? null : <title>{slot.label}</title>}
            {reveal?.fadeOutTier[slot.id] != null ? (
              <g className="village-map-fade-out">
                <SlotMark slot={slot} tier={reveal.fadeOutTier[slot.id]} tuning={tuning} highlighted={highlighted} />
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
                if (event.animationName !== "village-map-fade-in") return;
                setRevealHighlight(false);
              }}
            >
              <SlotMark
                slot={slot}
                tier={slot.tier}
                tuning={tuning}
                highlighted={highlighted || (revealHighlight && reveal?.fadeIn[slot.id] === true)}
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
        <MapBorderExtraContext.Provider value={trapsHighlighted ? MAP_HIGHLIGHT_BORDER : 0}>
          <g
            data-building="traps"
            style={{ cursor: "default" }}
            onPointerEnter={() => {
              setHoveredBuildingId("traps");
              onHoverBuilding?.("traps");
            }}
            onPointerLeave={() => {
              setHoveredBuildingId((current) => (current === "traps" ? null : current));
              onHoverBuilding?.(null);
            }}
          >
            {traps.map((trap, index) => (
              <g
                key={`trap-${index}`}
                transform={`translate(${trap.x} ${trap.y}) rotate(${(Math.sin(index * 2.17) * 10).toFixed(1)})`}
              >
                <circle r={trapSize * Math.SQRT2 + trapStroke} fill="transparent" />
                <g filter={OUTLINE_WOBBLE}>
                  <TrapMark
                    size={trapSize}
                    stroke={trapStroke}
                    color={tuning.trapColor}
                    improved={improved}
                  />
                </g>
              </g>
            ))}
          </g>
        </MapBorderExtraContext.Provider>
      ) : null}
    </svg>
  );
}
