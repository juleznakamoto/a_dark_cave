import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getViewportSize, subscribeViewportResize } from "@/lib/viewportSize";

const NOISE_SIZE = 256;

/** Smooth value noise for iChannel0 — avoids blocky nearest-neighbor squares. */
function createSmoothNoiseData(size = NOISE_SIZE): Uint8Array {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    grid[i] = Math.random();
  }

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const smooth = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const fade = (t: number) => t * t * (3 - 2 * t);
    const u = fade(xf);
    const v = fade(yf);
    const sample = (px: number, py: number) => {
      const sx = ((px % size) + size) % size;
      const sy = ((py % size) + size) % size;
      return grid[sy * size + sx];
    };
    return lerp(
      lerp(sample(xi, yi), sample(xi + 1, yi), u),
      lerp(sample(xi, yi + 1), sample(xi + 1, yi + 1), u),
      v,
    );
  };

  const data = new Uint8Array(size * size * 4);
  const blurRadius = 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -blurRadius; dy <= blurRadius; dy++) {
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          sum += smooth(x + dx, y + dy);
          count++;
        }
      }
      const value = Math.floor((sum / count) * 255);
      const idx = (y * size + x) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
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
    vec2 r = iResolution.xy,
         p = (I+I-r) / r.y * mat2(3.,4.,4.,-3.) / 1e2;

    vec4 S = vec4(0.0);
    vec4 C = vec4(1.,2.,3.,0.);
    vec4 W;

    for(float t=iTime, T=.1*t+p.y, i=0.; i<50.; i+=1.){
        S += (cos(W=sin(i)*C)+1.)
             * exp(sin(i+i*T))
             / length(max(p,
               p / vec2(2.0, sampleChannel0(p/exp(W.x)+vec2(i,t)/8.)*40.0)
             )) / 1e4;

        p += .02 * cos(i*(C.xz+8.0+i) + T + T);
    }

    fragOut = vec4(tanh((S*S).rgb), 1.0);
}

void main() {
  mainImage(O, gl_FragCoord.xy);
}`;

class StarshipWebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private noiseTexture: WebGLTexture | null = null;
  private uniforms: {
    iTime: WebGLUniformLocation | null;
    iResolution: WebGLUniformLocation | null;
    iChannel0: WebGLUniformLocation | null;
  } = { iTime: null, iResolution: null, iChannel0: null };

  private vertexSrc = `#version 300 es
    precision highp float;
    in vec4 position;
    void main(){gl_Position=position;}`;

  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) {
      throw new Error("WebGL2 context not available");
    }
    this.canvas = canvas;
    this.gl = gl;
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resizeToDisplay(displayWidth: number, displayHeight: number) {
    const baseScale = displayWidth < 600 ? 0.5 : 1;
    const dpr = Math.min(2, Math.max(1, baseScale * window.devicePixelRatio));
    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error("Starship shader compile error:", gl.getShaderInfoLog(shader));
    }
  }

  setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER)!;
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, fragmentShaderSource);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      logger.error("Starship shader link error:", gl.getProgramInfoLog(this.program));
    }
  }

  init() {
    const gl = this.gl;
    const program = this.program!;

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.vertices),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.uniforms.iTime = gl.getUniformLocation(program, "iTime");
    this.uniforms.iResolution = gl.getUniformLocation(program, "iResolution");
    this.uniforms.iChannel0 = gl.getUniformLocation(program, "iChannel0");

    const noiseData = createSmoothNoiseData();
    this.noiseTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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

  render(now = 0) {
    const gl = this.gl;
    const program = this.program;
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
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
    if (this.noiseTexture) {
      gl.deleteTexture(this.noiseTexture);
      this.noiseTexture = null;
    }
    if (this.program && !gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
      if (this.vs) {
        gl.detachShader(this.program, this.vs);
        gl.deleteShader(this.vs);
      }
      if (this.fs) {
        gl.detachShader(this.program, this.fs);
        gl.deleteShader(this.fs);
      }
      gl.deleteProgram(this.program);
    }
  }
}

export function StarshipShader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StarshipWebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const [visible, setVisible] = useState(false);
  const isActiveRef = useRef(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initRenderer = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const { width, height } = getViewportSize();
          try {
            const renderer = new StarshipWebGLRenderer(canvas);
            renderer.resizeToDisplay(width, height);
            renderer.setup();
            renderer.init();
            rendererRef.current = renderer;
            setVisible(true);

            const loop = (now: number) => {
              if (!isActiveRef.current || !rendererRef.current) return;
              rendererRef.current.render(now);
              animationFrameRef.current = requestAnimationFrame(loop);
            };
            animationFrameRef.current = requestAnimationFrame(loop);
          } catch (err) {
            logger.warn("[StarshipShader] WebGL init failed:", err);
          }
        });
      });
    };

    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
        initRenderer,
      );
    } else {
      setTimeout(initRenderer, 300);
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 h-full w-full bg-black transition-opacity duration-1000",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

/** @deprecated Use StarshipShader — kept for drop-in demo compatibility */
export const Component = StarshipShader;
