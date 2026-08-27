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
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { tailwindToHex } from "@/lib/tailwindColors";
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
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * coverage, coverage);
}`,
  );
  if (!patched.includes("u_clipRect") || !patched.includes("coverage")) {
    throw new Error(
      "Shared progress fragment splice failed — smoke shader source changed?",
    );
  }
  return patched;
}

const SHARED_PROGRESS_FRAGMENT_SHADER = buildSharedProgressFragmentShader(
  SMOKE_FLOW_FRAGMENT_SHADER,
);

type SegmentRegistration = {
  id: string;
  element: HTMLElement;
};

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
 * in-cell rim. Reading getComputedStyle here ran in the 15fps loop and forced
 * a style recalc on every bar cell.
 */
function syncSegmentRims(host: HTMLElement, rimLayer: HTMLElement) {
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
      rim.className = SEGMENT_RIM_BASE_CLASS;
      rim.style.pointerEvents = "none";
      rim.setAttribute("aria-hidden", "true");
      rimLayer.appendChild(rim);
    }
    const r = cell.getBoundingClientRect();
    // Keep the 1px outside rim flush with the segment's left edge. The source
    // rim starts 1px inside so its shadow still reaches, but never overhangs,
    // that edge.
    rim.style.left = `${r.left - layerRect.left + 1}px`;
    rim.style.top = `${r.top - layerRect.top}px`;
    rim.style.width = `${Math.max(0, r.width - 1)}px`;
    rim.style.height = `${r.height}px`;
    rim.classList.toggle(
      SEGMENT_RIM_FILLED_CLASS,
      cell.hasAttribute("data-filled"),
    );
    i++;
  }
  while (rimLayer.children.length > i) {
    rimLayer.lastChild?.remove();
  }
}

type SharedProgressShaderApi = {
  registerSegment: (id: string, element: HTMLElement | null) => void;
  useShader: boolean;
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
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    });
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
    gl.enable(gl.SCISSOR_TEST);
    // Premultiplied source: needed so antialiased corner pixels blend out.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
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
  ) {
    const gl = this.gl;
    const seconds = ((performance.now() - this.startMs) / 1000) * 0.15;
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform4f(
      this.uniforms.scene,
      this.canvas.width,
      this.canvas.height,
      seconds,
      this.colorCount,
    );
    gl.uniform4f(this.uniforms.shape, this.scale, 0.85, 0.5, 0.35);

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    // Fill the whole cell bg; the CSS rim sits on top of this edge.
    const cornerRadiusPx = SEGMENT_CORNER_RADIUS_CSS_PX * dpr;

    for (const { element } of segments) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 0.5 || rect.height < 0.5) continue;

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

      // Scissor to the fill tip. Pad top/bottom/right 1px so outside-only AA can
      // sit under the CSS rim (box-shadow). Do not pad left: that bled into the
      // gap before each segment and made the grow look like it started left of
      // the section.
      const fillLeft = (rect.left - canvasRect.left) * dpr;
      const fillRight = fillLeft + rect.width * dpr;
      const fillBottom = canvasH - (rect.bottom - canvasRect.top) * dpr;
      const fillTop = fillBottom + rect.height * dpr;
      const outerRight = left + width;
      const outerTop = bottom + height;

      const sx = Math.max(0, Math.floor(Math.max(fillLeft, left)));
      const sy = Math.max(0, Math.floor(Math.max(fillBottom, bottom) - 1));
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

      gl.uniform4f(this.uniforms.clipRect, left, bottom, width, height);
      gl.uniform4f(this.uniforms.finish, 0.0, 0.0, 0.0, cornerRadiusPx);
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
}: {
  children: ReactNode;
  className?: string;
  /** Field zoom (lower = larger smoke features). Shared parked context uses 3. */
  scale?: number;
  /** False while Estate stays mounted but hidden. Pauses the 15fps loop. */
  visible?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHolderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rimLayerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SharedProgressShaderRenderer | null>(null);
  const shaderRef = useRef<ParkedSharedProgressShader | null>(null);
  const segmentsRef = useRef<Map<string, HTMLElement>>(new Map());
  const rafRef = useRef(0);
  const activeRef = useRef(true);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const paintRef = useRef<(canvas: HTMLCanvasElement) => void>(() => { });
  const startLoopRef = useRef<() => void>(() => { });
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

  const api = useMemo<SharedProgressShaderApi>(
    () => ({ registerSegment, useShader }),
    [registerSegment, useShader],
  );

  useLayoutEffect(() => {
    if (!useShader) return;
    const holder = canvasHolderRef.current;
    const host = hostRef.current;
    if (!holder || !host) return;

    activeRef.current = true;
    const FRAME_INTERVAL_MS = 1000 / 15;
    let lastFrameTime = 0;
    let cancelled = false;
    let attachRaf = 0;
    let ro: ResizeObserver | null = null;

    const paintFrame = (canvas: HTMLCanvasElement) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.width < 1 || canvasRect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.resizeToDisplay(canvasRect.width, canvasRect.height, dpr);
      const list: SegmentRegistration[] = [];
      segmentsRef.current.forEach((element, id) => {
        list.push({ id, element });
      });
      renderer.render(list, canvasRect, dpr);
      const rimLayer = rimLayerRef.current;
      if (rimLayer) syncSegmentRims(host, rimLayer);
    };
    paintRef.current = paintFrame;

    const loop = (now: number) => {
      const canvas = canvasRef.current;
      if (
        !activeRef.current ||
        !visibleRef.current ||
        !rendererRef.current ||
        !canvas ||
        document.hidden
      ) {
        return;
      }
      const box = canvas.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) {
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
      // 15fps wall-clock cap (not "every 4th rAF") so 120Hz stays at 15.
      if (lastFrameTime > 0 && now - lastFrameTime < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime = now;
      paintFrame(canvas);
    };

    const startLoop = () => {
      if (!activeRef.current || !visibleRef.current || document.hidden) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    startLoopRef.current = startLoop;

    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      } else {
        startLoop();
      }
    };

    const attachShader = (shader: ParkedSharedProgressShader) => {
      shader.canvas.style.cssText = ACTIVE_CANVAS_STYLE;
      holder.appendChild(shader.canvas);
      canvasRef.current = shader.canvas;
      rendererRef.current = shader.renderer;
      shaderRef.current = shader;
      // Children already registered in their layout effects. Paint now so
      // the first Estate frame includes smoke instead of a solid fill.
      paintFrame(shader.canvas);
      startLoop();
      ro =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            paintFrame(canvas);
            startLoop();
          })
          : null;
      ro?.observe(host);
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
    };

    const onResize = () => {
      const canvas = canvasRef.current;
      if (canvas) paintFrame(canvas);
    };

    const detachShader = () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
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
            setUseShader(false);
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
  }, [useShader]);

  useLayoutEffect(() => {
    if (!visible) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintRef.current(canvas);
    startLoopRef.current();
  }, [visible]);

  return (
    <SharedProgressShaderContext.Provider value={api}>
      {/* overflow-visible: segment rims sit 1px outside the bg via box-shadow */}
      <div ref={hostRef} className={cn("relative overflow-visible", className)}>
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
              className="pointer-events-none absolute inset-0 z-10 !m-0 h-full w-full opacity-90"
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
        !api?.useShader && SHARED_PROGRESS_SHADER_FALLBACK_CLASS,
        className,
      )}
      style={style}
      aria-hidden
    />
  );
}
