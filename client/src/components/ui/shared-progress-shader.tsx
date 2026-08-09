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

/** Red smoke palette (low → high) for progress-bar fills. */
export const SHARED_PROGRESS_SHADER_COLOR_TOKENS = [
  "red-950",
  "red-900",
  "red-700",
  "orange-200",
] as const;

export const SHARED_PROGRESS_SHADER_FALLBACK_CLASS = "bg-red-950";

type SegmentRegistration = {
  id: string;
  element: HTMLElement;
};

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

    const vs = this.compile(gl.VERTEX_SHADER, SMOKE_FLOW_VERTEX_SHADER, "vertex");
    const fs = this.compile(
      gl.FRAGMENT_SHADER,
      SMOKE_FLOW_FRAGMENT_SHADER,
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
    };

    gl.useProgram(program);
    gl.uniform3fv(this.uniforms.colors, this.colors);
    gl.uniform4f(this.uniforms.shape, this.scale, 0.6, 0.5, 0.0);
    gl.uniform4f(this.uniforms.surface, 2.4, 1.22, 0.0, 1.0);
    gl.uniform4f(this.uniforms.finish, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.transform, 635.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.space, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.cursor, 0.0, 2.0, 0.65, 0.46);
    gl.enable(gl.SCISSOR_TEST);
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
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clear transparent, then draw the smoke field into each segment scissor.
   * `gl_FragCoord` stays in full-canvas space, so segments sample different
   * parts of one continuous field.
   */
  render(
    segments: SegmentRegistration[],
    hostRect: DOMRectReadOnly,
    dpr: number,
  ) {
    const gl = this.gl;
    const seconds = ((performance.now() - this.startMs) / 1000) * 0.97;
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
    gl.uniform4f(this.uniforms.shape, this.scale, 0.6, 0.5, 0.0);

    const canvasH = this.canvas.height;
    for (const { element } of segments) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 0.5 || rect.height < 0.5) continue;
      const x = Math.round((rect.left - hostRect.left) * dpr);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      // WebGL scissor origin is bottom-left.
      const y = Math.round(
        canvasH - (rect.bottom - hostRect.top) * dpr,
      );
      if (w <= 0 || h <= 0) continue;
      gl.scissor(x, y, w, h);
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
  scale = 1.1,
}: {
  children: ReactNode;
  className?: string;
  /** Field zoom (lower = larger smoke features). */
  scale?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      if (!renderer || !host) return;
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.resizeToDisplay(rect.width, rect.height, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const loop = () => {
      if (!activeRef.current || !rendererRef.current || document.hidden) {
        return;
      }
      // ~30fps — same budget as shop SmokeShader.
      if (frameCount % 2 === 0) {
        const hostEl = hostRef.current;
        const renderer = rendererRef.current;
        if (hostEl && renderer) {
          const rect = hostEl.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          renderer.resizeToDisplay(rect.width, rect.height, dpr);
          const list: SegmentRegistration[] = [];
          segmentsRef.current.forEach((element, id) => {
            list.push({ id, element });
          });
          renderer.render(list, rect, dpr);
        }
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
      <div ref={hostRef} className={cn("relative", className)}>
        {/* Behind fills so glow/sparks stay on top; segments are transparent windows. */}
        {useShader ? (
          <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          />
        ) : null}
        <div className="relative z-[1]">{children}</div>
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
