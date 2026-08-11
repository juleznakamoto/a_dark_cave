"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  "absolute rounded-[4px] transition-[box-shadow] duration-300";

/**
 * Position rim divs over each SegmentedProgress cell so the outside ring sits
 * above the shared smoke canvas (the in-cell rim alone would be covered).
 *
 * Uses box-shadow copied from `[data-segmented-progress-rim]` so the ring stays
 * outside the bg and color edits on SegmentedProgress still apply.
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
    const created = !rim;
    if (!rim) {
      rim = document.createElement("div");
      rim.className = SEGMENT_RIM_BASE_CLASS;
      rim.style.boxShadow = "0 0 0 1px transparent";
      rim.setAttribute("aria-hidden", "true");
      rimLayer.appendChild(rim);
    }
    const r = cell.getBoundingClientRect();
    rim.style.left = `${r.left - layerRect.left}px`;
    rim.style.top = `${r.top - layerRect.top}px`;
    rim.style.width = `${r.width}px`;
    rim.style.height = `${r.height}px`;

    const sourceRim = cell.querySelector<HTMLElement>(
      "[data-segmented-progress-rim]",
    );
    const nextShadow = sourceRim
      ? getComputedStyle(sourceRim).boxShadow
      : "none";
    if (created && nextShadow !== "none") {
      // Start transparent, then flip so the shadow can fade in.
      void rim.offsetWidth;
    }
    rim.style.boxShadow = nextShadow;
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
    this.canvas.style.width = `${width / dpr}px`;
    this.canvas.style.height = `${height / dpr}px`;
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

      // Scissor to the fill tip, with 1px pad outside the cell so the outside-only
      // AA fringe can sit under the CSS rim (box-shadow) instead of getting cut.
      const fillLeft = (rect.left - canvasRect.left) * dpr;
      const fillRight = fillLeft + rect.width * dpr;
      const fillBottom = canvasH - (rect.bottom - canvasRect.top) * dpr;
      const fillTop = fillBottom + rect.height * dpr;
      const outerRight = left + width;
      const outerTop = bottom + height;

      const sx = Math.max(0, Math.floor(Math.max(fillLeft, left) - 1));
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

export function SharedProgressShaderHost({
  children,
  className,
  // Higher than shop smoke: thin progress segments need smaller features or
  // each scissor window is one flat mid-palette color.
  scale = 3,
}: {
  children: ReactNode;
  className?: string;
  /** Field zoom (lower = larger smoke features). */
  scale?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rimLayerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SharedProgressShaderRenderer | null>(null);
  const segmentsRef = useRef<Map<string, HTMLElement>>(new Map());
  const rafRef = useRef(0);
  const activeRef = useRef(true);
  const [useShader, setUseShader] = useState(false);

  const colors = useMemo(
    () => buildColors(SHARED_PROGRESS_SHADER_COLOR_TOKENS),
    [],
  );

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

  useEffect(() => {
    setUseShader(shouldAnimateSmokeShader());
  }, []);

  useEffect(() => {
    if (!useShader) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    activeRef.current = true;
    let frameCount = 0;

    try {
      rendererRef.current = new SharedProgressShaderRenderer(
        canvas,
        colors,
        SHARED_PROGRESS_SHADER_COLOR_TOKENS.length,
        scale,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        "[SharedProgressShader] WebGL init failed, using CSS fallback:",
        message,
      );
      setUseShader(false);
      return;
    }

    const syncSize = () => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      // Prefer the canvas layout box (inset:0 padding box), not the host
      // border box — mismatch was painting a second strip under each bar.
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.resizeToDisplay(rect.width, rect.height, dpr);
    };

    const loop = () => {
      if (!activeRef.current || !rendererRef.current || document.hidden) {
        return;
      }
      // ~30fps — same budget as shop SmokeShader.
      if (frameCount % 2 === 0) {
        const renderer = rendererRef.current;
        if (renderer) {
          const canvasRect = canvas.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          renderer.resizeToDisplay(canvasRect.width, canvasRect.height, dpr);
          const list: SegmentRegistration[] = [];
          segmentsRef.current.forEach((element, id) => {
            list.push({ id, element });
          });
          renderer.render(list, canvasRect, dpr);
        }
        const rimLayer = rimLayerRef.current;
        if (rimLayer) syncSegmentRims(host, rimLayer);
      }
      frameCount++;
      rafRef.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (!activeRef.current || document.hidden) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      } else {
        startLoop();
      }
    };

    syncSize();
    startLoop();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncSize())
        : null;
    ro?.observe(host);
    window.addEventListener("resize", syncSize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      activeRef.current = false;
      ro?.disconnect();
      window.removeEventListener("resize", syncSize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.reset();
      rendererRef.current = null;
    };
  }, [useShader, colors, scale]);

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
            <canvas
              ref={canvasRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 !m-0 h-full w-full opacity-90"
            />
            {/* Cell rims above smoke so the grey border is not covered by WebGL. */}
            <div
              ref={rimLayerRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 !m-0"
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
