import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

#define SMOKE_BLUR 50

float blurredSmoke(vec2 p){
  vec2 o=vec2(SMOKE_BLUR)/R.y;
  float s=fbm(p)*.34;
  s+=fbm(p+vec2(o.x,0.))*.165;
  s+=fbm(p-vec2(o.x,0.))*.165;
  s+=fbm(p+vec2(0.,o.y))*.165;
  s+=fbm(p-vec2(0.,o.y))*.165;
  return s;
}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  col.r-=blurredSmoke(uv+vec2(0,T*.015)+n);
  col.g-=blurredSmoke(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=blurredSmoke(uv*1.006+vec2(0,T*.015)+n+.006);

  col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));

  col=mix(vec3(.08),col,min(time*.25,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

class Renderer {
  private readonly vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private color: [number, number, number] = [0.5, 0.5, 0.5];
  private uniforms: {
    resolution: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    u_color: WebGLUniformLocation | null;
  } = { resolution: null, time: null, u_color: null };

  constructor(canvas: HTMLCanvasElement, fragmentSource: string) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      throw new Error("WebGL2 context not available");
    }
    this.gl = gl;
    this.setup(fragmentSource);
    this.init();
  }

  updateColor(newColor: [number, number, number]) {
    this.color = newColor;
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio);
    const { innerWidth: width, innerHeight: height } = window;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error(
        "[SmokeBackground] Shader compilation error:",
        gl.getShaderInfoLog(shader),
      );
    }
  }

  reset() {
    const { gl, program, vs, fs, buffer } = this;
    if (buffer) {
      gl.deleteBuffer(buffer);
      this.buffer = null;
    }
    if (!program) return;
    if (vs) {
      gl.detachShader(program, vs);
      gl.deleteShader(vs);
      this.vs = null;
    }
    if (fs) {
      gl.detachShader(program, fs);
      gl.deleteShader(fs);
      this.fs = null;
    }
    gl.deleteProgram(program);
    this.program = null;
  }

  private setup(fragmentSource: string) {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!this.vs || !this.fs || !program) return;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, fragmentSource);
    this.program = program;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      logger.error(
        "[SmokeBackground] Program linking error:",
        gl.getProgramInfoLog(this.program),
      );
    }
  }

  private init() {
    const { gl, program } = this;
    if (!program) return;
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
    this.uniforms = {
      resolution: gl.getUniformLocation(program, "resolution"),
      time: gl.getUniformLocation(program, "time"),
      u_color: gl.getUniformLocation(program, "u_color"),
    };
  }

  render(now = 0) {
    const { gl, program, buffer, canvas, uniforms } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (uniforms.resolution) {
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    }
    if (uniforms.time) {
      gl.uniform1f(uniforms.time, now * 1e-3);
    }
    if (uniforms.u_color) {
      gl.uniform3fv(uniforms.u_color, this.color);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
    : null;
};

interface SmokeBackgroundProps {
  smokeColor?: string;
  className?: string;
}

export function SmokeBackground({
  smokeColor = "#808080",
  className,
}: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas, fragmentShaderSource);
    } catch (err) {
      logger.error("[SmokeBackground] WebGL init failed:", err);
      return;
    }
    rendererRef.current = renderer;

    const handleResize = () => renderer.updateScale();
    handleResize();
    window.addEventListener("resize", handleResize);

    let animationFrameId = 0;
    const loop = (now: number) => {
      renderer.render(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    loop(0);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.reset();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const rgbColor = hexToRgb(smokeColor);
    if (rgbColor) {
      renderer.updateColor(rgbColor);
    }
  }, [smokeColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block h-full w-full", className)}
    />
  );
}
