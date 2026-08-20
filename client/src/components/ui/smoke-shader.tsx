import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { tailwindToHex } from "@/lib/tailwindColors";

/**
 * Solid fallback when WebGL is skipped or fails. Matches the dark end of the
 * smoke palette (`blue-950`) so the shop banner still reads as intentional.
 */
export const SMOKE_SHADER_FALLBACK_CLASS = "bg-blue-950";

/**
 * Skip the animated shader on weak / battery-sensitive devices. Nested fbm
 * per pixel is fine on a tiny banner for most phones, but reduced motion,
 * Data Saver, and low-RAM devices (Chrome reports 4 on a 4 GB box) should
 * get the CSS fallback.
 */
export function shouldAnimateSmokeShader(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    return false;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
    return false;
  }
  // Vitest/jsdom has no WebGL. Stay on the CSS fallback.
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  return true;
}

/**
 * "Smoke" flow shader.
 * WebGL1 fullscreen triangle with packed uniforms.
 */
const FRAGMENT_SHADER = `// "Smoke" flow shader
// Packed WebGL1 uniforms (the shader exposes readable u_* aliases as macros):
//   u_colors[8] (first 4 used)
//   vec3(0.012, 0.110, 0.149)
//   vec3(0.106, 0.424, 0.659)
//   vec3(0.353, 0.824, 0.957)
//   vec3(0.918, 0.976, 1.000)
//   u_scene = vec4(canvas width, canvas height, seconds * 0.97, 4.0)
//   u_shape = vec4(1.72, 0.60, 0.50, 0.00)
//   u_surface = vec4(2.40, 1.22, 0.00, 1.00)
//   u_finish = vec4(0.00, 0.00, 0.000, 0.00)
//   u_transform = vec4(635.0, 0.00, 0.00, 0.0)
//   u_space = vec4(0.00, 0.00, pointer x, pointer y)
//   u_cursor = vec4(presence, 2.0, 0.65, 0.46)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
// Seven packed vectors + eight colour vectors = 15 fragment uniform vectors,
// one below WebGL1's guaranteed minimum. Macros preserve the public u_* API.
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
// Keep hash inputs inside mediump's guaranteed ±2^14 range.
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Even, un-structured white noise for film grain (Dave Hoskins hash12). The
// multiply hash above is fine for value noise but shows a faint axis-aligned
// mesh at integer fragment coords, which reads as a net over flat areas.
float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(15731.743, 7892.321) * n);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

// --- OKLab colour mixing (perceptual), gated by u_oklab -----------------------
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  // max() guards the sRGB branch: out-of-gamut OKLab interpolations can send a
  // channel negative, and pow(negative, …) is NaN which mix()/step() would
  // then propagate. The linear branch clips such channels to 0 downstream.
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

// Mix through the palette colours; x is clamped to 0..1. WebGL1 forbids
// dynamic uniform indexing in fragment shaders, hence the constant loop.
vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  float warp = 2.0 + u_intensity * 4.0;
  vec2 q = vec2(fbm(p + t * 0.08), fbm(p + vec2(5.2, 1.3) - t * 0.06));
  vec2 r = vec2(fbm(p + warp * q + vec2(1.7, 9.2)),
                fbm(p + warp * q + vec2(8.3, 2.8)));
  return palette(fbm(p + 3.0 * r + u_seed));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  // Cursor modes 1–3 are local distortions. Push shifts the same screen-space
  // coordinates before field transforms, so Zoom/Rotate don't change its feel.
  if (u_cursorPresence > 0.001) {
    // u_mouse is normalized to -1..1 in canvas space. Convert it to the same
    // aspect-corrected screen space as p so effects stay under the cursor.
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)
      / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence
        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(
          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  // Keep presets that read uv (rather than p) in the same warped space.
  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  // Field transform: rotate, pan, pointer push, slow drift.
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  // Organic domain warp.
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  // Shade, with an optional soft 5-tap blur.
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  // Post: contrast, saturation, hue, brightness, vignette, grain.
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/** Shared by `shared-progress-shader` (one context, many scissor windows). */
export {
  FRAGMENT_SHADER as SMOKE_FLOW_FRAGMENT_SHADER,
  VERTEX_SHADER as SMOKE_FLOW_VERTEX_SHADER,
};

/**
 * Smoke palette as Tailwind colour tokens (low → high).
 * Edit these — they feed `u_colors` via `tailwindToHex` (see `@/lib/tailwindColors`).
 * Default range: #031C26 → #EAF9FF.
 */
export const SMOKE_SHADER_COLOR_TOKENS = [
  "blue-950",
  "indigo-900",
  "blue-700",
  "blue-100",
] as const;

function hexToRgb01(hex: string): [number, number, number] {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  if (raw.length !== 6) {
    logger.warn("[SmokeShader] Expected #RRGGBB from tailwindToHex, got:", hex);
    return [0, 0, 0];
  }
  return [
    parseInt(raw.slice(0, 2), 16) / 255,
    parseInt(raw.slice(2, 4), 16) / 255,
    parseInt(raw.slice(4, 6), 16) / 255,
  ];
}

/** Palette colours (sRGB 0–1), first N used; remaining slots padded with the last. */
function buildSmokeColors(
  tokens: readonly string[] = SMOKE_SHADER_COLOR_TOKENS,
): Float32Array {
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

const COLORS = buildSmokeColors();

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

/** Default for u_shape.x (zoom). Lower = larger on-screen smoke features. */
export const SMOKE_SHADER_DEFAULT_SCALE = 1.72;

/**
 * Shop insight-banner zoom. Edit this (not DEFAULT) — ShopDialog passes it
 * explicitly, so DEFAULT alone never reaches the live banner.
 */
export const SMOKE_SHADER_BANNER_SCALE = 0.55;

class SmokeWebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private uniforms: SmokeUniforms;
  private startMs = performance.now();
  private scale: number;

  constructor(canvas: HTMLCanvasElement, scale = SMOKE_SHADER_DEFAULT_SCALE) {
    this.canvas = canvas;
    this.scale = scale;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error("WebGL1 context not available");
    }
    this.gl = gl;

    const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SHADER, "vertex");
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER, "fragment");
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
      throw new Error(`Smoke shader link failed: ${log}`);
    }
    this.program = program;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Failed to create WebGL buffer");
    this.buffer = buffer;
    // Fullscreen triangle covering clip space.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, "position");
    if (position < 0)
      throw new Error("Smoke shader missing position attribute");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const requireUniform = (...names: string[]): WebGLUniformLocation => {
      for (const name of names) {
        const loc = gl.getUniformLocation(program, name);
        if (loc) return loc;
      }
      throw new Error(`Smoke shader missing uniform ${names[0]}`);
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
    gl.uniform3fv(this.uniforms.colors, COLORS);
    // Packed uniforms (cursor presence = 0 — cursor off).
    this.writeShapeUniform();
    gl.uniform4f(this.uniforms.surface, 2.4, 1.22, 0.0, 1.0);
    gl.uniform4f(this.uniforms.finish, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.transform, 635.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.space, 0.0, 0.0, 0.0, 0.0);
    gl.uniform4f(this.uniforms.cursor, 0.0, 2.0, 0.65, 0.46);
  }

  /** Field zoom (`u_shape.x`). Safe to call every frame / on prop change. */
  setScale(scale: number) {
    this.scale = scale;
    this.gl.useProgram(this.program);
    this.writeShapeUniform();
  }

  private writeShapeUniform() {
    this.gl.uniform4f(this.uniforms.shape, this.scale, 0.6, 0.5, 0.0);
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
      throw new Error(`Smoke ${label} shader compile failed: ${log}`);
    }
    return shader;
  }

  resizeToDisplay(displayWidth: number, displayHeight: number) {
    const width = Math.max(1, Math.round(displayWidth));
    const height = Math.max(1, Math.round(displayHeight));
    // Banner is small; 1× CSS pixels is enough and cuts GPU fill on phones.
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  render() {
    const gl = this.gl;
    const seconds = ((performance.now() - this.startMs) / 1000) * 0.97;
    gl.clearColor(0.012, 0.11, 0.149, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    // Re-upload zoom each frame so HMR / setScale cannot leave a stale uniform.
    this.writeShapeUniform();
    gl.uniform4f(
      this.uniforms.scene,
      this.canvas.width,
      this.canvas.height,
      seconds,
      SMOKE_SHADER_COLOR_TOKENS.length,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  reset() {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
  }
}

interface SmokeShaderProps {
  className?: string;
  /**
   * Field zoom (`u_shape.x`). Default is 1.72. Lower values enlarge
   * smoke features — useful for small surfaces like banners.
   */
  scale?: number;
}

/** Animated Smoke flow shader (WebGL1), with a solid blue CSS fallback. */
export function SmokeShader({
  className,
  scale = SMOKE_SHADER_DEFAULT_SCALE,
}: SmokeShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SmokeWebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const isActiveRef = useRef(true);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const [useShader, setUseShader] = useState(false);

  // Decide on the client only (SSR / first paint stay on the CSS fallback).
  useEffect(() => {
    setUseShader(shouldAnimateSmokeShader());
  }, []);

  // Mount WebGL once; scale updates go through setScale (full re-init breaks HMR).
  useEffect(() => {
    if (!useShader) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    isActiveRef.current = true;
    let resizeObserver: ResizeObserver | null = null;
    const FRAME_INTERVAL_MS = 1000 / 15;
    let lastFrameTime = 0;

    const resizeFromParent = () => {
      const parent = canvas.parentElement;
      if (!parent || !rendererRef.current) return;
      const rect = parent.getBoundingClientRect();
      rendererRef.current.resizeToDisplay(rect.width, rect.height);
    };

    const loop = (now: number) => {
      if (!isActiveRef.current || !rendererRef.current || document.hidden) {
        return;
      }
      animationFrameRef.current = requestAnimationFrame(loop);
      // 15fps wall-clock cap (not "every 4th rAF") so 120Hz stays at 15.
      if (lastFrameTime > 0 && now - lastFrameTime < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime = now;
      rendererRef.current.setScale(scaleRef.current);
      rendererRef.current.render();
    };

    const startLoop = () => {
      if (!isActiveRef.current || document.hidden || !rendererRef.current) {
        return;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
      } else {
        startLoop();
      }
    };

    try {
      const renderer = new SmokeWebGLRenderer(canvas, scaleRef.current);
      rendererRef.current = renderer;
      resizeFromParent();
      startLoop();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        "[SmokeShader] WebGL init failed, using blue fallback:",
        message,
      );
      setUseShader(false);
    }

    const parent = canvas.parentElement;
    if (parent && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => resizeFromParent());
      resizeObserver.observe(parent);
    }
    window.addEventListener("resize", resizeFromParent);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isActiveRef.current = false;
      window.removeEventListener("resize", resizeFromParent);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver?.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.reset();
        rendererRef.current = null;
      }
    };
  }, [useShader]);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          SMOKE_SHADER_FALLBACK_CLASS,
          className,
        )}
        aria-hidden
      />
      {useShader ? (
        <canvas
          ref={canvasRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full",
            className,
          )}
        />
      ) : null}
    </>
  );
}
