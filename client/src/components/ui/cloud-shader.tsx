import { useRef, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { getViewportSize, subscribeViewportResize } from "@/lib/viewportSize";

function createWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const contexts: WebGLContextAttributes[] = [
    {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    },
    {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
    },
  ];

  for (const attrs of contexts) {
    const gl = canvas.getContext("webgl2", attrs);
    if (gl) return gl;
  }

  throw new Error("WebGL2 context not available");
}

// ---------------- WebGL Renderer ----------------
class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private scale: number;
  private shaderSource: string;

  private vertexSrc = `#version 300 es
    precision highp float;
    in vec4 position;
    void main(){gl_Position=position;}`;

  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement, scale: number, shaderSource: string) {
    this.canvas = canvas;
    this.scale = scale;
    this.shaderSource = shaderSource;
    const gl = createWebGL2Context(canvas);
    this.gl = gl;
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resizeToDisplay(displayWidth: number, displayHeight: number) {
    const baseScale = displayWidth < 600 ? 0.25 : 0.4;
    const dpr = Math.max(1, baseScale * window.devicePixelRatio);
    this.scale = dpr;
    this.canvas.width = Math.round(displayWidth * dpr);
    this.canvas.height = Math.round(displayHeight * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      logger.error("Shader compilation error:", error);
    }
  }

  setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER)!;
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, this.shaderSource);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      logger.error(gl.getProgramInfoLog(this.program));
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
    (program as any).resolution = gl.getUniformLocation(program, "resolution");
    (program as any).time = gl.getUniformLocation(program, "time");
    (program as any).mouse = gl.getUniformLocation(program, "mouse");
  }

  private mouseX = 0;
  private mouseY = 0;

  setMouse(canvasX: number, canvasY: number) {
    this.mouseX = canvasX;
    this.mouseY = canvasY;
  }

  render(now = 0) {
    const gl = this.gl;
    const program = this.program;
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform2f(
      (program as any).resolution,
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform1f((program as any).time, now * 1e-3);
    gl.uniform2f((program as any).mouse, this.mouseX, this.mouseY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  reset() {
    const gl = this.gl;
    if (
      this.program &&
      !gl.getProgramParameter(this.program, gl.DELETE_STATUS)
    ) {
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

// ---------------- Shader Source ----------------
const shaderSource = `#version 300 es
    precision highp float;
    out vec4 O;
    uniform vec2 resolution;
    uniform float time;
    uniform vec2 mouse;
    #define FC gl_FragCoord.xy
    #define T time
    #define R resolution
    #define MN min(R.x,R.y)

    #define PRIMARY_COLOR vec3(0.7, 0.7, 0.7)
    #define BACKGROUND_TINT vec3(0.025, 0.025, 0.025)
    #define MAX_COLOR_DEVIATION 1.0
    #define CLOUD_COLOR_DEVIATION 1.2
    #define CLOUD_SPEED 0.04

    float rnd(vec2 p) {
      p=fract(p*vec2(12.9898,78.233));
      p+=dot(p,p+34.56);
      return fract(p.x*p.y);
    }

    float noise(in vec2 p) {
      vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
      float
      a=rnd(i),
      b=rnd(i+vec2(1,0)),
      c=rnd(i+vec2(0,1)),
      d=rnd(i+1.);
      return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
    }

    float fbm(vec2 p) {
      float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
      for (int i=0; i<5; i++) {
        t+=a*noise(p);
        p*=2.*m;
        a*=.5;
      }
      return t;
    }

    float clouds(vec2 p) {
      float d=1., t=.0;
      for (float i=.0; i<3.; i++) {
        float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
        t=mix(t,d,a);
        d=a;
        p*=2./(i+1.);
      }
      return t;
    }

    void main(void) {
      vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
      float bg=clouds(vec2(st.x+T*CLOUD_SPEED,-st.y));
      vec3 cloudColor = BACKGROUND_TINT * (1.0 + (bg - 0.5) * CLOUD_COLOR_DEVIATION);

      // Same mouse glow as sleep mist (MistBackground)
      vec2 aspectUv = FC / R;
      aspectUv.x *= R.x / R.y;
      vec2 mPos = mouse / R;
      mPos.x *= R.x / R.y;
      float dist = distance(aspectUv, mPos);
      float mouseGlow = smoothstep(0.21, 0.0, dist);
      cloudColor += mouseGlow * 0.05 * vec3(0.6, 0.7, 1.0);

      O=vec4(cloudColor,1);
    }`;

// ---------------- CloudShader Component ----------------
interface CloudShaderProps {
  className?: string;
}

export default function CloudShader({ className = "" }: CloudShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const [visible, setVisible] = useState(false); // for fade-in
  const isActiveRef = useRef(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Per-effect gate. isActiveRef is shared across Strict Mode remounts, so a
    // stale inner rAF from the previous run can see it flipped back to true.
    let cancelled = false;
    let outerFrame = 0;
    let innerFrame = 0;
    isActiveRef.current = true;

    const startRenderer = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = getViewportSize();
      const baseScale = width < 600 ? 0.25 : 0.4;
      const dpr = Math.max(1, baseScale * window.devicePixelRatio);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      try {
        const renderer = new WebGLRenderer(canvas, dpr, shaderSource);
        renderer.setup();
        renderer.init();
        if (cancelled) {
          renderer.reset();
          return;
        }
        rendererRef.current = renderer;
        setVisible(true);

        const FRAME_INTERVAL_MS = 1000 / 30;
        let lastFrameTime = 0;
        const loop = (now: number) => {
          if (cancelled || !isActiveRef.current || !rendererRef.current) return;
          animationFrameRef.current = requestAnimationFrame(loop);
          // 30fps wall-clock cap (not "every other rAF") so 120Hz stays at 30.
          if (lastFrameTime > 0 && now - lastFrameTime < FRAME_INTERVAL_MS) {
            return;
          }
          lastFrameTime = now;
          rendererRef.current.render(now);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
      } catch (err) {
        logger.warn("[CloudShader] WebGL execution failed:", err);
      }
    };

    // Wait one frame so the start-screen first paint is not blocked.
    // Do not use requestIdleCallback here: a busy start screen can starve it
    // forever (no timeout), which leaves the background black.
    outerFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      innerFrame = requestAnimationFrame(startRenderer);
    });

    const handleResize = () => {
      if (cancelled || !rendererRef.current) return;
      const { width, height } = getViewportSize();
      rendererRef.current.resizeToDisplay(width, height);
    };

    const unsubscribeViewport = subscribeViewportResize(handleResize);

    const syncMouseFromClient = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (cancelled || !canvas || !renderer) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
      const canvasY =
        (1 - (clientY - rect.top) / rect.height) * canvas.height;
      renderer.setMouse(canvasX, canvasY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      syncMouseFromClient(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      syncMouseFromClient(touch.clientX, touch.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      cancelled = true;
      isActiveRef.current = false;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
      unsubscribeViewport();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.reset();
        rendererRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-0 w-full h-full object-cover transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"
        } ${className}`}
      style={{
        background: "black",
      }}
    />
  );
}
