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

import {
  BorderStack,
  CROSSED_HATCH_WIDTH,
  HatchStripes,
  MAP_HIGHLIGHT_BORDER,
  MapBorderExtraContext,
  MapHighlightFadeContext,
  MapInkContext,
  SilhouetteHighlight,
  bridgeHatchPaths,
  useMapInk,
  useOutlineRing,
  wobbleFilterId,
  type Footprint,
  type MarkTuning,
} from "@/pages/village-map-demo/mapChrome";

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
export const CHITIN_STROKE = WALL_CHITIN_STROKE;
/** Ebon Grace teeth and ring. Dark red, not the map ink. */
const EBON_GRACE = "#3a0c0c";
/** Brimstone furnace plates. */
const BRIMSTONE_INFUSION = "#5c2206";
/** Black line between the village paper and the palisade. Same weight as the outer edge. */
export const VILLAGE_INK_GAP = PALISADE_BORDER;
/** Hair of room past the ink. The game chrome around the panel is the margin. */
export const MAP_VIEW_PAD = 6;

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
export function ChitinRibbon({ d, color }: { d: string; color: string }) {
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

export function markRotation(buildingId: string, at: Point): string | undefined {
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

export function TrapMark({
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

export function SlotMark({
  slot,
  tier,
  tuning,
  highlighted = false,
  fadeHighlight = false,
  fadeClassName,
  fadeStyle,
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
  /** Extra outline stays thick for 0.5s, then fades to the normal border over the last 1s. */
  fadeHighlight?: boolean;
  /**
   * Opacity animation. It shares the wobble's element, so the drawing fades and stays wobbly.
   * A fade-in scales the drawing from 1.15 to 1, bounces to 0.95, and settles at 1, with a slight black shadow.
   */
  fadeClassName?: string;
  fadeStyle?: CSSProperties;
  heartfireLevel?: number;
  ebonGrace?: boolean;
  brimstoneInfusion?: boolean;
  dedication?: readonly SanctumGod[];
  dedicationDeepened?: SanctumGod | null;
  drawbridge?: BastionDrawbridge | null;
  /** How far the wall hatch reaches, so a drawbridge can reuse those lines. */
  hatchReach?: number;
}) {
  const enterScale = fadeClassName?.includes("village-map-fade-in") === true;
  const mark = (
    <>
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
    </>
  );
  return (
    <MapHighlightFadeContext.Provider value={fadeHighlight}>
      <MapBorderExtraContext.Provider value={highlighted ? MAP_HIGHLIGHT_BORDER : 0}>
        {/* Fade and wobble share this element. Opacity on a child of the filter does not fade the drawing. */}
        <g
          data-facing=""
          transform={markRotation(slot.buildingId, slot)}
          className={fadeClassName}
          style={fadeStyle}
          filter={slot.buildingId === "heartfire" ? undefined : outlineWobble(slot.id)}
        >
          {enterScale ? <g className="village-map-enter-scale">{mark}</g> : mark}
        </g>
      </MapBorderExtraContext.Provider>
    </MapHighlightFadeContext.Provider>
  );
}
