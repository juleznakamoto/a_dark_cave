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
  CROSSED_HATCH_WIDTH,
  HATCH_WIDTH,
  MAP_HIGHLIGHT_BORDER,
  MapHoverRingContext,
  MapInkContext,
  OUTLINE_WOBBLE,
  OutlineWobbleFilter,
  SilhouetteHighlight,
  VILLAGE_OUTLINE_WOBBLE,
  VILLAGE_STROKE_WOBBLE,
  localHatchPaths,
  moatHatchPaths,
} from "@/pages/village-map-demo/mapChrome";
import {
  CHITIN_STROKE,
  ChitinRibbon,
  MAP_VIEW_PAD,
  SlotMark,
  TrapMark,
  VILLAGE_INK_GAP,
  markRotation,
} from "@/pages/village-map-demo/mapMarks";

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

/** A first appearance and an upgrade each get their own thick border. Epoch replays the demo fade. */
function revealFadeSignature(
  reveal: VillageMapReveal | null,
  slotId: string,
  epoch: number,
): string | null {
  if (reveal?.fadeIn[slotId] !== true) return null;
  const previous = reveal.fadeOutTier[slotId];
  const kind = previous == null ? "in" : `up:${previous}`;
  return `${epoch}:${kind}`;
}

const OPEN_WAIT_STYLE = {
  "--village-map-open-delay": `${VILLAGE_MAP_OPEN_FADE_DELAY_MS}ms`,
} as CSSProperties;

function slotOpensWithWait(reveal: VillageMapReveal | null, slotId: string): boolean {
  return reveal?.openWait?.[slotId] === true;
}

function fadeInClass(reveal: VillageMapReveal | null, slotId: string): string | undefined {
  if (reveal?.fadeIn[slotId] !== true) return undefined;
  const upgrade = reveal.fadeOutTier[slotId] != null;
  const wait = slotOpensWithWait(reveal, slotId);
  return [
    "village-map-fade-in",
    upgrade ? "village-map-fade-in--after-out" : "",
    wait ? "village-map-fade--open-wait" : "",
  ].filter(Boolean).join(" ");
}

function pathOpensWithWait(path: VillagePath, reveal: VillageMapReveal | null): boolean {
  if (!reveal?.openWait) return false;
  const held = (id: string) =>
    reveal.fadeIn[id] === true && reveal.fadeOutTier[id] == null && reveal.openWait?.[id] === true;
  if (held("heartfire:0")) return true;
  return path.slotIds.some(held);
}

function pathFadeClass(path: VillagePath, reveal: VillageMapReveal | null): string | undefined {
  if (!pathWaitsForBuilding(path, reveal)) return undefined;
  if (!pathOpensWithWait(path, reveal)) return "village-map-path-after-building";
  return "village-map-path-after-building village-map-path--open-wait";
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

/** Hover lights every mark of that building. :hover alone only reaches the one under the pointer. */
function applyBuildingHover(svg: SVGSVGElement | null, buildingId: string | null) {
  if (!svg) return;
  for (const el of svg.querySelectorAll("[data-building].is-hovered")) {
    el.classList.remove("is-hovered");
  }
  if (!buildingId) return;
  for (const el of svg.querySelectorAll(`[data-building="${CSS.escape(buildingId)}"]`)) {
    el.classList.add("is-hovered");
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
  /** Bumps to replay the same reveal. The game leaves this at 0. */
  revealEpoch?: number;
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
  revealEpoch = 0,
  readOnly = false,
  heartfireLevel = 5,
  trees = NO_TREES,
  placingTree = null,
  onPlaceTree,
  onMoveTree,
  onRemoveTree,
  svgRef,
  highlightRef,
}: VillageMapSvgProps) {
  const dragRef = useRef<{ id: string; dx: number; dy: number; buildingId: string } | null>(null);
  const pathDragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const treeDragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const pendingSlotRef = useRef<Point | null>(null);
  const pendingPathRef = useRef<Point | null>(null);
  const pendingTreeRef = useRef<Point | null>(null);
  const draggingSlotRef = useRef<string | null>(null);
  const hoveredBuildingRef = useRef<string | null>(null);
  const setHoveredBuilding = (buildingId: string | null) => {
    if (hoveredBuildingRef.current === buildingId) return;
    hoveredBuildingRef.current = buildingId;
    applyBuildingHover(svgRef.current, buildingId);
  };
  const pathNodesRef = useRef<Map<string, { ribbon: Element | null; hit: Element | null }> | null>(null);
  pathNodesRef.current = null;
  const treeWobbleId = `tree-wobble-${useId().replace(/:/g, "")}`;
  // After a real commit only. Highlight changes are applied by VillageMapHighlight
  // and must not rebuild this svg.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    applyBuildingHighlight(svg, highlightRef.current);
    applyDraggingSlot(svg, draggingSlotRef.current);
    applyBuildingHover(svg, hoveredBuildingRef.current);
  });
  // Per slot, the fade signature whose thick border has already eased off.
  // A shared flag was cleared by whichever animation ended first, so some fades lost the border.
  const [easedBorder, setEasedBorder] = useState<Record<string, string>>({});
  const [pathReady, setPathReady] = useState<Record<string, true>>({});
  const [pathEpoch, setPathEpoch] = useState(revealEpoch);
  if (pathEpoch !== revealEpoch) {
    setPathEpoch(revealEpoch);
    setPathReady({});
  }
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
    setHoveredBuilding("palisades");
    onHoverBuilding?.("palisades");
  };
  const onPalisadeLeave = () => {
    setHoveredBuilding(null);
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
                      key={`${path.id}-${revealEpoch}`}
                      data-path={path.id}
                      className={pathFadeClass(path, reveal)}
                      style={waiting && pathOpensWithWait(path, reveal) ? OPEN_WAIT_STYLE : undefined}
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
                          key={`outline-${path.id}-${revealEpoch}`}
                          d={path.ribbon}
                          fill="#000"
                          className={pathFadeClass(path, reveal)}
                          style={waiting && pathOpensWithWait(path, reveal) ? OPEN_WAIT_STYLE : undefined}
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
                setHoveredBuilding("fortifiedMoat");
                onHoverBuilding?.("fortifiedMoat");
              }}
              onPointerLeave={() => {
                setHoveredBuilding(null);
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
            const fadeSignature = revealFadeSignature(reveal, slot.id, revealEpoch);
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
                      setHoveredBuilding(null);
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
                  setHoveredBuilding(slot.buildingId);
                  onActiveLabel(slot.label);
                  onHoverBuilding?.(slot.buildingId);
                }}
                onPointerLeave={() => {
                  setHoveredBuilding(null);
                  onActiveLabel(null);
                  onHoverBuilding?.(null);
                }}
              >
                {onHoverBuilding ? null : <title>{slot.label}</title>}
                {reveal?.fadeOutTier[slot.id] != null ? (
                  <g key={`fade-out-${revealEpoch}`}>
                    <SlotMark
                      slot={slot}
                      tier={reveal.fadeOutTier[slot.id]}
                      tuning={markTuning}
                      fadeClassName={
                        slotOpensWithWait(reveal, slot.id)
                          ? "village-map-fade-out village-map-fade--open-wait"
                          : "village-map-fade-out"
                      }
                      fadeStyle={slotOpensWithWait(reveal, slot.id) ? OPEN_WAIT_STYLE : undefined}
                      heartfireLevel={heartfireLevel}
                      ebonGrace={build.ebonGrace}
                      brimstoneInfusion={build.brimstoneInfusion}
                      dedication={build.dedication}
                      dedicationDeepened={build.dedicationDeepened}
                    />
                  </g>
                ) : null}
                <g
                  key={`fade-in-${revealEpoch}`}
                  onAnimationEnd={(event) => {
                    if (event.animationName !== "village-map-highlight-fade") return;
                    if (event.elapsedTime < 0.5 || fadeSignature == null) return;
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
                    fadeClassName={fadeInClass(reveal, slot.id)}
                    fadeStyle={slotOpensWithWait(reveal, slot.id) ? OPEN_WAIT_STYLE : undefined}
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
                setHoveredBuilding("traps");
                onHoverBuilding?.("traps");
              }}
              onPointerLeave={() => {
                setHoveredBuilding(null);
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
  return (
    <>
      <VillageMapSvg {...props} svgRef={svgRef} highlightRef={highlightRef} />
      <VillageMapHighlight svgRef={svgRef} highlightId={highlightId} />
    </>
  );
}

export type {
  Footprint,
} from "@/pages/village-map-demo/mapChrome";

export {
  BuildingMark,
  MapInkProvider,
  UPGRADE_ICON_SIZE,
  UpgradeRuleIcon,
  buildingFootprint,
} from "@/pages/village-map-demo/mapMarks";
