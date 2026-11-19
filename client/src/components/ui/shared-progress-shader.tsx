"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createCappedPaintLoop } from "@/lib/cappedFrameLoop";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { tailwindToHex } from "@/lib/tailwindColors";
import {
  PROGRESS_GROW_EVENT,
  PROGRESS_GROWING_SELECTOR,
  SegmentedProgress,
} from "@/components/ui/progress-bar";
import {
  shouldAnimateSmokeShader,
  SMOKE_FLOW_FRAGMENT_SHADER,
  SMOKE_FLOW_VERTEX_SHADER,
} from "@/components/ui/smoke-shader";

/**
 * Red smoke palette (low → high) for progress-bar fills.
 * Wide luminance span (like shop Insight blue-950→blue-100) so swirls read clearly.
 */
export const SHARED_PROGRESS_SHADER_COLOR_TOKENS = [
  "red-900",
  "red-800",
  "red-600",
  "red-500",
] as const;

export const SHARED_PROGRESS_SHADER_FALLBACK_CLASS = "bg-red-950";

/** Matches Tailwind `rounded-[4px]` on SegmentedProgress segments. */
const SEGMENT_CORNER_RADIUS_CSS_PX = 4;
/** Smoke redraw while Estate or Bastion is visible. 100ms is 10 fps. */
export const SHARED_PROGRESS_SHADER_FRAME_MS = 100;

/**
 * Full canvas redraw, or only the bar whose fill width is moving.
 * Idle smoke stays at 10 fps. While Improve is running, keep painting just
 * that bar. A full redraw of every estate segment on the same frames made
 * the fill stutter, and a slow full redraw would schedule another one.
 */
export function resolveSharedProgressPaintScope(
  hasGrowingBar: boolean,
): "full" | "growing" {
  return hasGrowingBar ? "growing" : "full";
}

/**
 * Layout box used to size the shared WebGL canvas.
 *
 * After the first paint, `resizeToDisplay` pins the canvas CSS size to whole
 * device pixels so the fill is not resampled. Measuring that pinned canvas
 * again freezes the stale height, so later Estate rows (Tireless Worker and
 * other skills unlocked after the first visit) sit below the shader and show
 * only the solid `filledClassName` fallback.
 *
 * The host is the in-flow wrapper and grows with new bars — prefer it.
 * Fall back to the canvas only when the host is unmeasurable (`hidden` /
 * `display:none`).
 */
export function resolveSharedProgressShaderDisplayBox(
  hostRect: { width: number; height: number },
  canvasRect: { width: number; height: number },
): { width: number; height: number } {
  return {
    width: hostRect.width >= 1 ? hostRect.width : canvasRect.width,
    height: hostRect.height >= 1 ? hostRect.height : canvasRect.height,
  };
}

/**
 * SegmentedProgress rims are `left-px` (1 CSS px inset) so the 1px outside
 * ring does not sit in the gap. The smoke fill must use the same inset or a
 * bright sliver shows left of each border.
 */
export const SHARED_PROGRESS_RIM_LEFT_INSET_CSS_PX = 1;

export function resolveSharedProgressShaderCellClip(
  cell: { left: number; bottom: number; width: number; height: number },
  dpr: number,
): { left: number; bottom: number; width: number; height: number } {
  const inset = SHARED_PROGRESS_RIM_LEFT_INSET_CSS_PX * dpr;
  return {
    left: cell.left + inset,
    bottom: cell.bottom,
    width: Math.max(0, cell.width - inset),
    height: cell.height,
  };
}

/**
 * Smoke flow + per-draw rounded-rect clip. Packs corner radius into `u_finish.w`
 * (grain unused here) and adds one `u_clipRect` so we stay within WebGL1's
 * 16 fragment uniform-vector minimum.
 */
function buildSharedProgressFragmentShader(source: string): string {
  // smoke-shader.tsx is CRLF on Windows — normalize before splicing.
  const lf = source.replace(/\r\n/g, "\n");
  const withClipUniform = lf.replace(
    "uniform vec4 u_cursor;",
    `uniform vec4 u_cursor;
uniform vec4 u_clipRect; // xy bottom-left, zw size (gl_FragCoord / scissor space)
uniform float u_segmentOpacity;
`,
  );
  // u_finish.w is corner radius here — disable the stock grain path that shares it.
  const patched = withClipUniform.replace(
    `  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,
    `  // Clip to segment rounded-[4px] (scissor alone is square). Coverage is
  // smoothed over one device pixel so corners are antialiased, and the result
  // is premultiplied to match the context's premultipliedAlpha.
  float coverage = 1.0;
  if (u_clipRect.z > 0.5 && u_clipRect.w > 0.5) {
    vec2 halfSize = u_clipRect.zw * 0.5;
    vec2 center = u_clipRect.xy + halfSize;
    vec2 p = gl_FragCoord.xy - center;
    float r = clamp(u_finish.w, 0.0, min(halfSize.x, halfSize.y));
    vec2 d = abs(p) - halfSize + vec2(r);
    float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
    // Fade only outside the shape. Centering AA on the edge ([-0.5,0.5]) left
    // the perimeter half-transparent and showed a dark hairline under the rim.
    coverage = 1.0 - smoothstep(0.0, 1.0, dist);
    if (coverage <= 0.002) discard;
  }
  float alpha = coverage * u_segmentOpacity;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
}`,
  );
  if (
    !patched.includes("u_clipRect") ||
    !patched.includes("u_segmentOpacity") ||
    !patched.includes("coverage")
  ) {
    throw new Error(
      "Shared progress fragment splice failed — smoke shader source changed?",
    );
  }
  return patched;
}

const SHARED_PROGRESS_FRAGMENT_SHADER = buildSharedProgressFragmentShader(
  SMOKE_FLOW_FRAGMENT_SHADER,
);

/** Resting strength of estate and attack-wave bars. Hover uses full strength. */
export const SHARED_PROGRESS_BAR_REST_OPACITY = 0.8;

/**
 * Smoke is one canvas above every bar, so CSS opacity on a bar does not fade
 * the fill. Dim only bars marked `data-progress-dim`, and only while the
 * pointer is off that bar.
 */
export function sharedProgressSegmentOpacity(element: HTMLElement): number {
  const bar = element.closest<HTMLElement>("[data-progress-dim]");
  if (!bar || bar.matches(":hover")) return 1;
  return SHARED_PROGRESS_BAR_REST_OPACITY;
}

/**
 * Partial Improve paints redraw only the growing bar and leave the rest of
 * the canvas untouched. iOS throws that buffer away after every frame unless
 * it is preserved, which takes the smoke off every other Estate bar until
 * the fill animation ends.
 */
export const SHARED_PROGRESS_SHADER_CONTEXT_ATTRIBUTES: WebGLContextAttributes =
  {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  };

/** Resting smoke clock. `seconds` passed to the shader is real time times this. */
const SHARED_PROGRESS_SHADER_TIME_SCALE = 0.15;
/** Hovered estate and attack-wave bars. 11 = 1000% faster than the resting clock. */
const SHARED_PROGRESS_HOVER_TIME_MULTIPLIER = 11;
/** Ignore a stalled frame so waking the tab does not leap the pattern forward. */
const SHARED_PROGRESS_HOVER_DT_CAP_SECONDS = 0.1;

/**
 * Extra seconds added on top of the resting clock while a bar is hovered.
 * The extra stays after the pointer leaves, so the pattern does not jump.
 */
export function nextSharedProgressHoverExtraSeconds(
  extraSeconds: number,
  dtSeconds: number,
  hovered: boolean,
): number {
  if (!hovered || dtSeconds <= 0) return extraSeconds;
  const dt = Math.min(SHARED_PROGRESS_HOVER_DT_CAP_SECONDS, dtSeconds);
  return (
    extraSeconds +
    dt *
      SHARED_PROGRESS_SHADER_TIME_SCALE *
      (SHARED_PROGRESS_HOVER_TIME_MULTIPLIER - 1)
  );
}

type SegmentRegistration = {
  id: string;
  element: HTMLElement;
};

function nodeListContains(roots: ArrayLike<Node>, element: Node): boolean {
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (root instanceof Node && root.contains(element)) return true;
  }
  return false;
}

/** Matches SegmentedProgress cell rim — painted above the WebGL canvas. */
const SEGMENT_RIM_BASE_CLASS =
  "pointer-events-none absolute rounded-[4px] transition-[box-shadow] duration-300";
/** Same class as SegmentedProgress filled rims (already in the CSS bundle). */
const SEGMENT_RIM_FILLED_CLASS =
  "shadow-[0_0_0_1px_theme(colors.orange.600/0.8)]";

/**
 * Position rim divs over each SegmentedProgress cell so the outside ring sits
 * above the shared smoke canvas (the in-cell rim alone would be covered).
 *
 * Filled vs empty uses `data-filled` + the same Tailwind shadow class as the
 * in-cell rim. Reading getComputedStyle here ran in the paint loop and forced
 * a style recalc on every bar cell.
 */
function syncSegmentRims(
  host: HTMLElement,
  rimLayer: HTMLElement,
  filledClass: string = SEGMENT_RIM_FILLED_CLASS,
) {
  const cells = host.querySelectorAll<HTMLElement>(
    "[data-segmented-progress-cell]",
  );
  // Rims are positioned inside rimLayer — use its box, not the host border box.
  const layerRect = rimLayer.getBoundingClientRect();
  let i = 0;
  for (const cell of Array.from(cells)) {
    let rim = rimLayer.children[i] as HTMLElement | undefined;
    if (!rim) {
      rim = document.createElement("div");
      rim.style.pointerEvents = "none";
      rim.setAttribute("aria-hidden", "true");
      rimLayer.appendChild(rim);
    }
    const r = cell.getBoundingClientRect();
    // Keep the 1px outside rim flush with the segment's left edge. The source
    // rim starts 1px inside so its shadow still reaches, but never overhangs,
    // that edge.
    const left = `${r.left - layerRect.left + 1}px`;
    const top = `${r.top - layerRect.top}px`;
    const width = `${Math.max(0, r.width - 1)}px`;
    const height = `${r.height}px`;
    const opacity = String(sharedProgressSegmentOpacity(cell));
    if (rim.style.left !== left) rim.style.left = left;
    if (rim.style.top !== top) rim.style.top = top;
    if (rim.style.width !== width) rim.style.width = width;
    if (rim.style.height !== height) rim.style.height = height;
    if (rim.style.opacity !== opacity) rim.style.opacity = opacity;
    const filled = cell.hasAttribute("data-filled") ? "1" : "0";
    if (rim.dataset.filled !== filled || rim.dataset.rimClass !== filledClass) {
      rim.className = SEGMENT_RIM_BASE_CLASS;
      if (filled === "1") {
        for (const token of filledClass.split(/\s+/).filter(Boolean)) {
          rim.classList.add(token);
        }
      }
      rim.dataset.filled = filled;
      rim.dataset.rimClass = filledClass;
    }
    i++;
  }
  while (rimLayer.children.length > i) {
    rimLayer.lastChild?.remove();
  }
}

type SharedProgressShaderApi = {
  registerSegment: (id: string, element: HTMLElement | null) => void;
  useShader: boolean;
  fallbackClass: string;
};

const SharedProgressShaderContext =
  createContext<SharedProgressShaderApi | null>(null);

function hexToRgb01(hex: string): [number, number, number] {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  if (raw.length !== 6) return [0, 0, 0];
  return [
    parseInt(raw.slice(0, 2), 16) / 255,
    parseInt(raw.slice(2, 4), 16) / 255,
    parseInt(raw.slice(4, 6), 16) / 255,
  ];
}

function buildColors(tokens: readonly string[]): Float32Array {
  const rgb = tokens.map((token) => hexToRgb01(tailwindToHex(token)));
  const last = rgb[rgb.length - 1] ?? ([0, 0, 0] as [number, number, number]);
  const out = new Float32Array(8 * 3);
  for (let i = 0; i < 8; i++) {
    const [r, g, b] = rgb[i] ?? last;
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  return out;
}

type SmokeUniforms = {
  colors: WebGLUniformLocation;
  scene: WebGLUniformLocation;
  shape: WebGLUniformLocation;
  surface: WebGLUniformLocation;
  finish: WebGLUniformLocation;
  transform: WebGLUniformLocation;
  space: WebGLUniformLocation;
  cursor: WebGLUniformLocation;
  clipRect: WebGLUniformLocation;
  segmentOpacity: WebGLUniformLocation;
};

/**
 * One WebGL1 context. Each frame scissors to registered segment rects so every
 * bar piece shows a different slice of the same red smoke field (screen UVs).
 */
class SharedProgressShaderRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private uniforms: SmokeUniforms;
  private startMs = performance.now();
  private lastFrameMs = performance.now();
  /** Per bar, so only the hovered bar runs fast and its segments stay in sync. */
  private hoverExtraSeconds = new WeakMap<HTMLElement, number>();
  private scale: number;
  private colors: Float32Array;
  private colorCount: number;

  constructor(
    canvas: HTMLCanvasElement,
    colors: Float32Array,
    colorCount: number,
    scale: number,
  ) {
    this.canvas = canvas;
    this.colors = colors;
    this.colorCount = colorCount;
    this.scale = scale;
    // Compile against a 1×1 backing store. Growing to the host size after
    // link keeps first-context + shader compile off a huge framebuffer
    // (Estate used to size this canvas to the whole scrollable panel).
    if (canvas.width !== 1 || canvas.height !== 1) {
      canvas.width = 1;
      canvas.height = 1;
    }
    const gl = canvas.getContext(
      "webgl",
      SHARED_PROGRESS_SHADER_CONTEXT_ATTRIBUTES,
    );
    if (!gl) throw new Error("WebGL1 context not available");
    this.gl = gl;

    const vs = this.compile(
      gl.VERTEX_SHADER,
      SMOKE_FLOW_VERTEX_SHADER,
      "vertex",
    );
    const fs = this.compile(
      gl.FRAGMENT_SHADER,
      SHARED_PROGRESS_FRAGMENT_SHADER,
      "fragment",
    );
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "unknown link error";
      gl.deleteProgram(program);
      throw new Error(`Shared progress shader link failed: ${log}`);
    }
    this.program = program;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Failed to create WebGL buffer");
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, "position");
    if (position < 0) throw new Error("Missing position attribute");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const requireUniform = (...names: string[]): WebGLUniformLocation => {
      for (const name of names) {
        const loc = gl.getUniformLocation(program, name);
        if (loc) return loc;
      }
      throw new Error(`Missing uniform ${names[0]}`);
    };

    this.uniforms = {
      colors: requireUniform("u_colors[0]", "u_colors"),
      scene: requireUniform("u_scene"),
      shape: requireUniform("u_shape"),
      surface: requireUniform("u_surface"),
      finish: requireUniform("u_finish"),
      transform: requireUniform("u_transform"),
      space: requireUniform("u_space"),
      cursor: requireUniform("u_cursor"),
      clipRect: requireUniform("u_clipRect"),
      segmentOpacity: requireUniform("u_segmentOpacity"),
    };

    gl.useProgram(program);
    gl.uniform3fv(this.uniforms.colors, this.colors);
    // High scale: bars are ~h-2; shop's ~1.7 zoom reads as a flat color there.
    // Warp + intensity keep swirls moving inside each scissor window.
    gl.uniform4f(this.uniforms.shape, this.scale, 0.85, 0.5, 0.35);
    gl.uniform4f(this.uniforms.surface, 2.8, 1.35, 0.0, 1.15);
    // finish.w = corner radius in px (see SHARED_PROGRESS_FRAGMENT_SHADER).
    gl.uniform4f(this.uniforms.finish, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.transform, 635.0, 0.0, 0.12, 1.0);
    gl.uniform4f(this.uniforms.space, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.cursor, 0.0, 2.0, 0.65, 0.46);
    gl.uniform4f(this.uniforms.clipRect, 0.0, 0.0, 0.0, 0.0);
    gl.uniform1f(this.uniforms.segmentOpacity, 1);
    gl.enable(gl.SCISSOR_TEST);
    // Premultiplied source: needed so antialiased corner pixels blend out.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  setColors(tokens: readonly string[]) {
    this.colors = buildColors(tokens);
    this.colorCount = tokens.length;
    this.gl.useProgram(this.program);
    this.gl.uniform3fv(this.uniforms.colors, this.colors);
  }

  private compile(type: number, source: string, label: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error(`Failed to create ${label} shader`);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "unknown compile error";
      gl.deleteShader(shader);
      throw new Error(`Shared progress ${label} compile failed: ${log}`);
    }
    return shader;
  }

  resizeToDisplay(displayWidth: number, displayHeight: number, dpr: number) {
    const width = Math.max(1, Math.round(displayWidth * dpr));
    const height = Math.max(1, Math.round(displayHeight * dpr));
    // Pin the CSS box to whole device pixels. Letting `w-full` stretch the
    // backing store by a fraction of a pixel resamples the fill and softens it.
    // Only write when the value changed: this runs from the rAF loop, and a
    // style write followed by getBoundingClientRect is a forced reflow.
    const cssW = `${width / dpr}px`;
    const cssH = `${height / dpr}px`;
    if (this.canvas.style.width !== cssW) this.canvas.style.width = cssW;
    if (this.canvas.style.height !== cssH) this.canvas.style.height = cssH;
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clear transparent, then draw the smoke field into each segment scissor.
   * `gl_FragCoord` stays in full-canvas space, so segments sample different
   * parts of one continuous field.
   *
   * `canvasRect` must be the canvas element's on-screen box (not the host
   * border box) so scissor lines up with `position:absolute; inset:0`.
   */
  render(
    segments: SegmentRegistration[],
    canvasRect: DOMRectReadOnly,
    dpr: number,
    /**
     * When set, skip the full clear and redraw only segments inside these
     * bars. Their cells are scissor-cleared first so a shrinking fill does
     * not leave smoke behind. Other bars keep the pixels from the last full
     * frame, which requires `preserveDrawingBuffer` (iOS clears the canvas
     * after each present otherwise).
     */
    growingRoots: ArrayLike<Node> | null = null,
  ) {
    const gl = this.gl;
    const partial = growingRoots != null && growingRoots.length > 0;
    const now = performance.now();
    const dtSeconds = (now - this.lastFrameMs) / 1000;
    this.lastFrameMs = now;
    const restSeconds =
      ((now - this.startMs) / 1000) * SHARED_PROGRESS_SHADER_TIME_SCALE;
    const boostedBars = new Set<HTMLElement>();
    gl.clearColor(0, 0, 0, 0);
    if (!partial) {
      gl.disable(gl.SCISSOR_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.enable(gl.SCISSOR_TEST);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform4f(this.uniforms.shape, this.scale, 0.85, 0.5, 0.35);

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    // Fill the whole cell bg; the CSS rim sits on top of this edge.
    const cornerRadiusPx = SEGMENT_CORNER_RADIUS_CSS_PX * dpr;

    for (const { element } of segments) {
      if (growingRoots && !nodeListContains(growingRoots, element)) continue;
      const bar = element.closest<HTMLElement>("[data-progress-dim]");
      const hovered = !!bar && bar.matches(":hover");
      if (bar && hovered && !boostedBars.has(bar)) {
        const prev = this.hoverExtraSeconds.get(bar) ?? 0;
        this.hoverExtraSeconds.set(
          bar,
          nextSharedProgressHoverExtraSeconds(prev, dtSeconds, true),
        );
        boostedBars.add(bar);
      }
      const seconds =
        restSeconds + (bar ? (this.hoverExtraSeconds.get(bar) ?? 0) : 0);
      gl.uniform4f(
        this.uniforms.scene,
        this.canvas.width,
        this.canvas.height,
        seconds,
        this.colorCount,
      );

      const rect = element.getBoundingClientRect();

      // Round against the whole cell, not the fill: a partially filled cell must
      // keep a straight cut at the fill edge and curve only at the cell's corners.
      const cell = element.closest<HTMLElement>(
        "[data-segmented-progress-cell]",
      );
      const shapeRect = cell ? cell.getBoundingClientRect() : rect;

      const left = (shapeRect.left - canvasRect.left) * dpr;
      const bottom = canvasH - (shapeRect.bottom - canvasRect.top) * dpr;
      const width = shapeRect.width * dpr;
      const height = shapeRect.height * dpr;
      if (width < 0.5 || height < 0.5) continue;

      const clip = resolveSharedProgressShaderCellClip(
        { left, bottom, width, height },
        dpr,
      );

      if (partial) {
        const clearLeft = Math.max(0, Math.floor(clip.left - 1));
        const clearBottom = Math.max(0, Math.floor(clip.bottom - 1));
        const clearRight = Math.min(
          canvasW,
          Math.ceil(clip.left + clip.width + 1),
        );
        const clearTop = Math.min(
          canvasH,
          Math.ceil(clip.bottom + clip.height + 1),
        );
        const clearW = clearRight - clearLeft;
        const clearH = clearTop - clearBottom;
        if (clearW > 0 && clearH > 0) {
          gl.scissor(clearLeft, clearBottom, clearW, clearH);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }

      if (rect.width < 0.5 || rect.height < 0.5) continue;

      // Scissor to the fill tip. Pad top/bottom/right 1px so outside-only AA can
      // sit under the CSS rim (box-shadow). Start at ceil(clip.left): floor +
      // left-pad painted a sliver in the gap before each segment.
      const fillLeft = (rect.left - canvasRect.left) * dpr;
      const fillRight = fillLeft + rect.width * dpr;
      const fillBottom = canvasH - (rect.bottom - canvasRect.top) * dpr;
      const fillTop = fillBottom + rect.height * dpr;
      const outerRight = clip.left + clip.width;
      const outerTop = clip.bottom + clip.height;

      const sx = Math.max(0, Math.ceil(Math.max(fillLeft, clip.left)));
      const sy = Math.max(0, Math.floor(Math.max(fillBottom, clip.bottom) - 1));
      const sRight = Math.min(
        canvasW,
        Math.ceil(Math.min(fillRight, outerRight) + 1),
      );
      const sTop = Math.min(
        canvasH,
        Math.ceil(Math.min(fillTop, outerTop) + 1),
      );
      const sw = sRight - sx;
      const sh = sTop - sy;
      if (sw <= 0 || sh <= 0) continue;

      gl.uniform4f(
        this.uniforms.clipRect,
        clip.left,
        clip.bottom,
        clip.width,
        clip.height,
      );
      gl.uniform4f(this.uniforms.finish, 0.0, 0.0, 0.0, cornerRadiusPx);
      gl.uniform1f(
        this.uniforms.segmentOpacity,
        sharedProgressSegmentOpacity(element),
      );
      gl.scissor(sx, sy, sw, sh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  reset() {
    const gl = this.gl;
    gl.disable(gl.SCISSOR_TEST);
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
  }
}

const PARKED_CANVAS_STYLE =
  "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;bottom:0;";
const ACTIVE_CANVAS_STYLE =
  "position:absolute;inset:0;display:block;width:100%;height:100%;";

type ParkedSharedProgressShader = {
  renderer: SharedProgressShaderRenderer;
  canvas: HTMLCanvasElement;
};

let parkedShader: ParkedSharedProgressShader | null = null;
let createPromise: Promise<ParkedSharedProgressShader | null> | null = null;
let shaderInUse = false;
let prewarmScheduled = false;

function applyParkedCanvasStyle(canvas: HTMLCanvasElement) {
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = PARKED_CANVAS_STYLE;
}

function createShaderInstance(): ParkedSharedProgressShader | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  applyParkedCanvasStyle(canvas);
  document.body.appendChild(canvas);
  try {
    return {
      renderer: new SharedProgressShaderRenderer(
        canvas,
        buildColors(SHARED_PROGRESS_SHADER_COLOR_TOKENS),
        SHARED_PROGRESS_SHADER_COLOR_TOKENS.length,
        3,
      ),
      canvas,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("[SharedProgressShader] WebGL init failed:", message);
    canvas.remove();
    return null;
  }
}

function ensureSharedProgressShader(): Promise<ParkedSharedProgressShader | null> {
  if (parkedShader) return Promise.resolve(parkedShader);
  if (createPromise) return createPromise;
  createPromise = Promise.resolve()
    .then(() => {
      if (parkedShader) return parkedShader;
      parkedShader = createShaderInstance();
      if (!parkedShader) prewarmScheduled = false;
      return parkedShader;
    })
    .finally(() => {
      createPromise = null;
    });
  return createPromise;
}

function takeParkedShader(): ParkedSharedProgressShader | null {
  if (!parkedShader) return null;
  const taken = parkedShader;
  parkedShader = null;
  shaderInUse = true;
  return taken;
}

function parkSharedProgressShader(shader: ParkedSharedProgressShader): void {
  // Move off the React tree first so unmount cannot delete the context.
  if (shader.canvas.parentElement !== document.body) {
    document.body.appendChild(shader.canvas);
  }
  applyParkedCanvasStyle(shader.canvas);
  try {
    shader.renderer.resizeToDisplay(1, 1, 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("[SharedProgressShader] Park resize failed:", message);
  }
  parkedShader = shader;
  shaderInUse = false;
}

async function acquireSharedProgressShader(): Promise<ParkedSharedProgressShader | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const ready = takeParkedShader();
    if (ready) return ready;
    if (!shaderInUse) {
      const created = await ensureSharedProgressShader();
      if (!created) return null;
      const taken = takeParkedShader();
      if (taken) return taken;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  return takeParkedShader();
}

/**
 * Compile this shader on a hidden 1×1 canvas during idle time, then keep
 * that WebGL context parked so Estate can adopt it on first paint.
 *
 * Opening the Estate tab used to create the first WebGL context of the
 * session and compile this nested-fbm program on the main thread. On Windows
 * ANGLE that can stall the page for many seconds: the cursor still moves,
 * but clicks, hovers, and tab switches queue until compile finishes.
 * Opening Trader "fixed" it because the shop banner compiled a sibling
 * smoke shader first and warmed the GPU.
 */
export function scheduleSharedProgressShaderPrewarm(
  options?: { immediate?: boolean },
): void {
  if (typeof window === "undefined") return;
  if (!shouldAnimateSmokeShader()) return;
  if (parkedShader || createPromise || shaderInUse) return;

  const run = () => {
    if (parkedShader || shaderInUse) return;
    void ensureSharedProgressShader();
  };

  if (options?.immediate) {
    prewarmScheduled = true;
    run();
    return;
  }

  if (prewarmScheduled) return;
  prewarmScheduled = true;

  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric.call(window, run, { timeout: 4000 });
  } else {
    setTimeout(run, 0);
  }
}

export function SharedProgressShaderHost({
  children,
  className,
  // Parked singleton is compiled at this zoom. Thin progress segments need
  // smaller features than shop smoke or each scissor window reads as flat.
  scale: _scale = 3,
  visible = true,
  colorTokens = SHARED_PROGRESS_SHADER_COLOR_TOKENS,
  rimFilledClass = SEGMENT_RIM_FILLED_CLASS,
  fallbackClass = SHARED_PROGRESS_SHADER_FALLBACK_CLASS,
}: {
  children: ReactNode;
  className?: string;
  /** Field zoom (lower = larger smoke features). Shared parked context uses 3. */
  scale?: number;
  /**
   * False while a kept-mounted tab is hidden. Parks the singleton so another
   * host (Estate ↔ Bastion) can adopt it, and pauses the 10fps loop.
   */
  visible?: boolean;
  /** Smoke palette tokens (low → high). Defaults to estate red. */
  colorTokens?: readonly string[];
  /** Filled-cell rim class mirrored above the canvas. */
  rimFilledClass?: string;
  /** Solid fill class when WebGL is off. */
  fallbackClass?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHolderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rimLayerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SharedProgressShaderRenderer | null>(null);
  const shaderRef = useRef<ParkedSharedProgressShader | null>(null);
  const segmentsRef = useRef<Map<string, HTMLElement>>(new Map());
  const activeRef = useRef(true);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const paintRef = useRef<(canvas: HTMLCanvasElement) => void>(() => { });
  const startLoopRef = useRef<() => void>(() => { });
  const stopLoopRef = useRef<() => void>(() => { });
  // Resolve on the first commit so the holder exists in time to adopt a
  // prewarmed context before the browser paints the Estate tab.
  const [useShader, setUseShader] = useState(() => shouldAnimateSmokeShader());

  const registerSegment = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (element) {
        segmentsRef.current.set(id, element);
      } else {
        segmentsRef.current.delete(id);
      }
    },
    [],
  );

  const colorTokensRef = useRef(colorTokens);
  colorTokensRef.current = colorTokens;
  const rimFilledClassRef = useRef(rimFilledClass);
  rimFilledClassRef.current = rimFilledClass;

  const api = useMemo<SharedProgressShaderApi>(
    () => ({ registerSegment, useShader, fallbackClass }),
    [registerSegment, useShader, fallbackClass],
  );

  useLayoutEffect(() => {
    if (!useShader || !visible) return;
    const holder = canvasHolderRef.current;
    const host = hostRef.current;
    if (!holder || !host) return;

    activeRef.current = true;
    let cancelled = false;
    let attachRaf = 0;
    let ro: ResizeObserver | null = null;

    let forceFull = true;

    const paintFrame = (
      canvas: HTMLCanvasElement,
      mode: "auto" | "full" = "full",
    ) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const growingRoots =
        mode === "auto"
          ? host.querySelectorAll(PROGRESS_GROWING_SELECTOR)
          : null;
      const hasGrowing = !!growingRoots && growingRoots.length > 0;
      const full =
        mode === "full" ||
        forceFull ||
        resolveSharedProgressPaintScope(hasGrowing) === "full";

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let canvasRect: DOMRect;
      if (full) {
        const hostBox = host.getBoundingClientRect();
        const canvasBox = canvas.getBoundingClientRect();
        const display = resolveSharedProgressShaderDisplayBox(
          hostBox,
          canvasBox,
        );
        if (display.width < 1 || display.height < 1) return;
        renderer.resizeToDisplay(display.width, display.height, dpr);
        // Scissor math is relative to the canvas element's on-screen box *after*
        // the CSS pin, which may be 1 device pixel off the host.
        canvasRect = canvas.getBoundingClientRect();
      } else {
        // Host size is stable while a fill width tweens. Skip the resize read.
        canvasRect = canvas.getBoundingClientRect();
      }
      if (canvasRect.width < 1 || canvasRect.height < 1) return;
      const list: SegmentRegistration[] = [];
      segmentsRef.current.forEach((element, id) => {
        if (full || (growingRoots && nodeListContains(growingRoots, element))) {
          list.push({ id, element });
        }
      });
      renderer.render(list, canvasRect, dpr, full ? null : growingRoots);
      if (!full) return;
      forceFull = false;
      const rimLayer = rimLayerRef.current;
      if (rimLayer) {
        syncSegmentRims(host, rimLayer, rimFilledClassRef.current);
      }
    };
    paintRef.current = paintFrame;

    let stopPaint = () => { };
    const paintLoop = createCappedPaintLoop(
      () =>
        host.querySelector(PROGRESS_GROWING_SELECTOR)
          ? 0
          : SHARED_PROGRESS_SHADER_FRAME_MS,
      () => {
        const canvas = canvasRef.current;
        if (!rendererRef.current || !canvas) return;
        const box = canvas.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) {
          stopPaint();
          return;
        }
        paintFrame(canvas, "auto");
      },
      {
        isActive: () => activeRef.current && visibleRef.current,
      },
    );
    stopPaint = () => paintLoop.stop();
    startLoopRef.current = () => paintLoop.start();
    stopLoopRef.current = () => paintLoop.stop();

    const onGrow = (event: Event) => {
      event.stopPropagation();
      // Drop the idle 100ms wait so the first grow frame is not a tenth of a
      // second late. The next paint is full; frames after that track the tip.
      forceFull = true;
      paintLoop.stop();
      paintLoop.start();
    };
    host.addEventListener(PROGRESS_GROW_EVENT, onGrow);

    const attachShader = (shader: ParkedSharedProgressShader) => {
      shader.canvas.style.cssText = ACTIVE_CANVAS_STYLE;
      holder.appendChild(shader.canvas);
      canvasRef.current = shader.canvas;
      rendererRef.current = shader.renderer;
      shader.renderer.setColors(colorTokensRef.current);
      shaderRef.current = shader;
      // Children already registered in their layout effects. Paint now so
      // the first Estate frame includes smoke instead of a solid fill.
      paintFrame(shader.canvas);
      paintLoop.start();
      ro =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            paintFrame(canvas);
            paintLoop.start();
          })
          : null;
      ro?.observe(host);
      window.addEventListener("resize", onResize);
    };

    const onResize = () => {
      const canvas = canvasRef.current;
      if (canvas) paintFrame(canvas);
    };

    const detachShader = () => {
      host.removeEventListener(PROGRESS_GROW_EVENT, onGrow);
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      paintLoop.stop();
      rendererRef.current = null;
      canvasRef.current = null;
      const shader = shaderRef.current;
      shaderRef.current = null;
      if (shader) parkSharedProgressShader(shader);
    };

    const ready = takeParkedShader();
    if (ready) {
      attachShader(ready);
    } else {
      // First paint already committed. Acquire after this frame so compile
      // cannot stall the tab switch; reuse an in-flight prewarm if there is one.
      attachRaf = requestAnimationFrame(() => {
        void acquireSharedProgressShader().then((shader) => {
          if (cancelled) {
            if (shader) parkSharedProgressShader(shader);
            return;
          }
          if (!shader) {
            // Another visible host still holds the singleton (demo page).
            // Keep useShader so we can adopt it when that host parks.
            return;
          }
          attachShader(shader);
        });
      });
    }

    return () => {
      cancelled = true;
      activeRef.current = false;
      if (attachRaf) cancelAnimationFrame(attachRaf);
      detachShader();
    };
  }, [useShader, visible]);

  useLayoutEffect(() => {
    if (!visible) {
      stopLoopRef.current();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintRef.current(canvas);
    startLoopRef.current();
  }, [visible]);

  useLayoutEffect(() => {
    rendererRef.current?.setColors(colorTokens);
  }, [colorTokens]);

  return (
    <SharedProgressShaderContext.Provider value={api}>
      {/* overflow-visible: segment rims sit 1px outside the bg via box-shadow */}
      <div
        ref={hostRef}
        className={cn("relative overflow-visible", className)}
        onPointerOver={() => {
          const canvas = canvasRef.current;
          if (canvas) paintRef.current(canvas);
        }}
        onPointerOut={() => {
          const canvas = canvasRef.current;
          if (canvas) paintRef.current(canvas);
        }}
      >
        {/*
          Content wrapper: host className often includes space-y-*, which would
          otherwise margin-shift the absolute canvas / rim layer down the page.
        */}
        <div className="relative">{children}</div>
        {/*
          Canvas sits above bar chrome and paints only into registered segment
          scissor rects. (Transparent "holes" cannot punch through opaque
          track backgrounds, so the shader must be drawn on top.)
        */}
        {useShader ? (
          <>
            <div
              ref={canvasHolderRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 !m-0 h-full w-full"
            />
            {/* Cell rims above smoke so the grey border is not covered by WebGL. */}
            <div
              ref={rimLayerRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 !m-0"
              style={{ pointerEvents: "none" }}
            />
          </>
        ) : null}
      </div>
    </SharedProgressShaderContext.Provider>
  );
}

/** Registers a DOM box as a scissor window into the shared red smoke field. */
export function SharedProgressShaderSegment({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const api = useContext(SharedProgressShaderContext);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!api) return;
    api.registerSegment(id, ref.current);
    return () => api.registerSegment(id, null);
  }, [api, id]);

  return (
    <div
      ref={ref}
      className={cn(
        !api?.useShader &&
        (api?.fallbackClass ?? SHARED_PROGRESS_SHADER_FALLBACK_CLASS),
        className,
      )}
      style={style}
      aria-hidden
    />
  );
}

/** Same grow timing as EstatePanel upgrade bars. */
export const ESTATE_STYLE_PROGRESS_GROW_MS = 1000;

/**
 * Estate-tab SegmentedProgress chrome: red smoke fill, orange rim, grow sparks.
 * Must sit inside a SharedProgressShaderHost.
 */
export function EstateStyleProgress({
  value,
  segments,
}: {
  value: number;
  segments: number;
}) {
  return (
    <SegmentedProgress
      value={value}
      segments={segments}
      showPercentage={false}
      compact
      growAnimationMs={ESTATE_STYLE_PROGRESS_GROW_MS}
      emitSparksOnGrow
      filledClassName="bg-red-950/80"
      emptyClassName="bg-neutral-800"
      segmentClassName="h-2"
      softenUntilHover
      renderFill={() => (
        <SharedProgressShaderSegment className="absolute inset-0" />
      )}
    />
  );
}
