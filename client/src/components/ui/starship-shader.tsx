import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getViewportSize, subscribeViewportResize } from "@/lib/viewportSize";

const NOISE_SIZE = 256;

function createNoiseData(size = NOISE_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = (Math.random() * 255) | 0;
    const idx = i * 4;
    data[idx] = value;
    data[idx + 1] = value;
    data[idx + 2] = value;
    data[idx + 3] = 255;
  }
  return data;
}

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;

float sampleChannel0(vec2 uv) {
  vec2 px = vec2(1.0 / ${NOISE_SIZE}.0);
  return (
    texture(iChannel0, uv).r +
    texture(iChannel0, uv + vec2(px.x, 0.0)).r +
    texture(iChannel0, uv - vec2(px.x, 0.0)).r +
    texture(iChannel0, uv + vec2(0.0, px.y)).r +
    texture(iChannel0, uv - vec2(0.0, px.y)).r
  ) / 5.0;
}

void mainImage(out vec4 fragOut, vec2 I)
{
    vec2 r = iResolution.xy;
    if (r.y < 1.0) {
      fragOut = vec4(0.0);
      return;
    }

    vec2 p = (I + I - r) / r.y * mat2(3.0, 4.0, 4.0, -3.0) / 100.0;

    vec4 S = vec4(0.0);
    vec4 C = vec4(1.0, 2.0, 3.0, 0.0);
    vec4 W;

    for (float i = 0.0; i < 50.0; i += 1.0) {
        float t = iTime;
        float T = 0.1 * t + p.y;
        W = sin(i) * C;
        S += (cos(W) + 1.0)
             * exp(sin(i + i * T))
             / length(max(p,
               p / vec2(2.0, sampleChannel0(p / exp(W.x) + vec2(i, t) / 8.0) * 40.0)
             )) / 10000.0;

        p += 0.02 * cos(i * (C.xz + 8.0 + i) + T + T);
    }

    fragOut = vec4(tanh((S * S).rgb), 1.0);
}

void main() {
  mainImage(O, gl_FragCoord.xy);
}`;

function createWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const contexts: WebGLContextAttributes[] = [
    { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false },
    { alpha: false, antialias: false, depth: false, stencil: false, failIfMajorPerformanceCaveat: false },
  ];

  for (const attrs of contexts) {
    const gl = canvas.getContext("webgl2", attrs);
    if (gl) return gl;
  }

  throw new Error("WebGL2 context not available");
}

class StarshipWebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private noiseTexture: WebGLTexture;
  private uniforms: {
    iTime: WebGLUniformLocation;
    iResolution: WebGLUniformLocation;
    iChannel0: WebGLUniformLocation;
  };

  private vertexSrc = `#version 300 es
    precision highp float;
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = createWebGL2Context(canvas);

    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, this.vertexSrc, "vertex");
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource, "fragment");
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
      throw new Error(`Starship shader link failed: ${log}`);
    }

    this.program = program;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Failed to create WebGL buffer");
    this.buffer = buffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "position");
    if (position < 0) throw new Error("Starship shader missing position attribute");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const iTime = gl.getUniformLocation(program, "iTime");
    const iResolution = gl.getUniformLocation(program, "iResolution");
    const iChannel0 = gl.getUniformLocation(program, "iChannel0");
    if (!iTime || !iResolution || !iChannel0) {
      throw new Error("Starship shader missing required uniforms");
    }
    this.uniforms = { iTime, iResolution, iChannel0 };

    const noiseTexture = gl.createTexture();
    if (!noiseTexture) throw new Error("Failed to create noise texture");
    this.noiseTexture = noiseTexture;

    const noiseData = createNoiseData();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      NOISE_SIZE,
      NOISE_SIZE,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      noiseData,
    );
  }

  private compileShader(type: number, source: string, label: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error(`Failed to create ${label} shader`);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "unknown compile error";
      gl.deleteShader(shader);
      throw new Error(`Starship ${label} shader compile failed: ${log}`);
    }
    return shader;
  }

  resizeToDisplay(displayWidth: number, displayHeight: number) {
    const width = Math.max(1, Math.round(displayWidth));
    const height = Math.max(1, Math.round(displayHeight));
    const baseScale = width < 600 ? 0.5 : 1;
    const dpr = Math.min(2, Math.max(1, baseScale * (window.devicePixelRatio || 1)));
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(now = 0) {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    gl.uniform1f(this.uniforms.iTime, now * 1e-3);
    gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
    gl.uniform1i(this.uniforms.iChannel0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  reset() {
    const gl = this.gl;
    gl.deleteTexture(this.noiseTexture);
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
  }
}

interface StarshipShaderProps {
  className?: string;
  onFatalError?: (message: string) => void;
}

export function StarshipShader({ className, onFatalError }: StarshipShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StarshipWebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const isActiveRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isActiveRef.current = true;

    try {
      const { width, height } = getViewportSize();
      const renderer = new StarshipWebGLRenderer(canvas);
      renderer.resizeToDisplay(width, height);
      rendererRef.current = renderer;

      const loop = (now: number) => {
        if (!isActiveRef.current || !rendererRef.current) return;
        rendererRef.current.render(now);
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("[StarshipShader] WebGL init failed:", message);
      onFatalError?.(message);
    }

    const handleResize = () => {
      if (!rendererRef.current) return;
      const { width, height } = getViewportSize();
      rendererRef.current.resizeToDisplay(width, height);
    };

    const unsubscribeViewport = subscribeViewportResize(handleResize);

    return () => {
      isActiveRef.current = false;
      unsubscribeViewport();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.reset();
        rendererRef.current = null;
      }
    };
  }, [onFatalError]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block h-full w-full bg-black", className)}
    />
  );
}

/** @deprecated Use StarshipShader — kept for drop-in demo compatibility */
export const Component = StarshipShader;
