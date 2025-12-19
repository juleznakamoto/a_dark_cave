import React, { useRef, useEffect } from "react";
import { logger } from "@/lib/logger";

// Types for component props
interface HeroProps {
  trustBadge?: {
    text: string;
    icons?: string[];
  };
  headline: {
    line1: string;
    line2: string;
  };
  subtitle1: string;
  subtitle2: string;
  subtitle3: string;

  buttons?: {
    primary?: {
      text: string;
      onClick?: () => void;
      buttonId?: string;
    };
    secondary?: {
      text: string;
      onClick?: () => void;
      buttonId?: string;
    };
    feedback?: {
      text: string;
      onClick?: () => void;
      buttonId?: string;
    };
  };
  socialButtons?: {
    instagram?: {
      onClick?: () => void;
    };
    reddit?: {
      onClick?: () => void;
    };
  };
  className?: string;
}

// Reusable Shader Background Hook
const useShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const pointersRef = useRef<PointerHandler | null>(null);

  // WebGL Renderer class
  class WebGLRenderer {
    private canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private vs: WebGLShader | null = null;
    private fs: WebGLShader | null = null;
    private buffer: WebGLBuffer | null = null;
    private scale: number;
    private shaderSource: string;
    private mouseMove = [0, 0];
    private mouseCoords = [0, 0];
    private pointerCoords = [0, 0];
    private nbrOfPointers = 0;

    private vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

    private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

    constructor(canvas: HTMLCanvasElement, scale: number) {
      this.canvas = canvas;
      this.scale = scale;
      this.gl = canvas.getContext("webgl2")!;
      this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
      this.shaderSource = defaultShaderSource;
    }

    updateShader(source: string) {
      this.reset();
      this.shaderSource = source;
      this.setup();
      this.init();
    }

    updateMove(deltas: number[]) {
      this.mouseMove = deltas;
    }

    updateMouse(coords: number[]) {
      this.mouseCoords = coords;
    }

    updatePointerCoords(coords: number[]) {
      this.pointerCoords = coords;
    }

    updatePointerCount(nbr: number) {
      this.nbrOfPointers = nbr;
    }

    updateScale(scale: number) {
      this.scale = scale;
      this.gl.viewport(
        0,
        0,
        this.canvas.width * scale,
        this.canvas.height * scale,
      );
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

    test(source: string) {
      let result = null;
      const gl = this.gl;
      const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        result = gl.getShaderInfoLog(shader);
      }
      gl.deleteShader(shader);
      return result;
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

      (program as any).resolution = gl.getUniformLocation(
        program,
        "resolution",
      );
      (program as any).time = gl.getUniformLocation(program, "time");
      (program as any).move = gl.getUniformLocation(program, "move");
      (program as any).touch = gl.getUniformLocation(program, "touch");
      (program as any).pointerCount = gl.getUniformLocation(
        program,
        "pointerCount",
      );
      (program as any).pointers = gl.getUniformLocation(program, "pointers");
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
      gl.uniform2f((program as any).move, ...this.mouseMove);
      gl.uniform2f((program as any).touch, ...this.mouseCoords);
      gl.uniform1i((program as any).pointerCount, this.nbrOfPointers);
      gl.uniform2fv((program as any).pointers, this.pointerCoords);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  // Pointer Handler class
  class PointerHandler {
    private scale: number;
    private active = false;
    private pointers = new Map<number, number[]>();
    private lastCoords = [0, 0];
    private moves = [0, 0];

    constructor(element: HTMLCanvasElement, scale: number) {
      this.scale = scale;

      const map = (
        element: HTMLCanvasElement,
        scale: number,
        x: number,
        y: number,
      ) => [x * scale, element.height - y * scale];

      element.addEventListener("pointerdown", (e) => {
        this.active = true;
        this.pointers.set(
          e.pointerId,
          map(element, this.getScale(), e.clientX, e.clientY),
        );
      });

      element.addEventListener("pointerup", (e) => {
        if (this.count === 1) {
          this.lastCoords = this.first;
        }
        this.pointers.delete(e.pointerId);
        this.active = this.pointers.size > 0;
      });

      element.addEventListener("pointerleave", (e) => {
        if (this.count === 1) {
          this.lastCoords = this.first;
        }
        this.pointers.delete(e.pointerId);
        this.active = this.pointers.size > 0;
      });

      element.addEventListener("pointermove", (e) => {
        if (!this.active) return;
        this.lastCoords = [e.clientX, e.clientY];
        this.pointers.set(
          e.pointerId,
          map(element, this.getScale(), e.clientX, e.clientY),
        );
        this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY];
      });
    }

    getScale() {
      return this.scale;
    }

    updateScale(scale: number) {
      this.scale = scale;
    }

    get count() {
      return this.pointers.size;
    }

    get move() {
      return this.moves;
    }

    get coords() {
      return this.pointers.size > 0
        ? Array.from(this.pointers.values()).flat()
        : [0, 0];
    }

    get first() {
      return this.pointers.values().next().value || this.lastCoords;
    }
  }

  const resize = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    if (rendererRef.current) {
      rendererRef.current.updateScale(dpr);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);

    rendererRef.current = new WebGLRenderer(canvas, dpr);
    pointersRef.current = new PointerHandler(canvas, dpr);

    rendererRef.current.setup();
    rendererRef.current.init();

    resize();

    if (rendererRef.current.test(defaultShaderSource) === null) {
      rendererRef.current.updateShader(defaultShaderSource);
    }

    let isActive = true;
    const loop = (now: number) => {
      if (!isActive || !rendererRef.current || !pointersRef.current) return;

      rendererRef.current.updateMouse(pointersRef.current.first);
      rendererRef.current.updatePointerCount(pointersRef.current.count);
      rendererRef.current.updatePointerCoords(pointersRef.current.coords);
      rendererRef.current.updateMove(pointersRef.current.move);
      rendererRef.current.render(now);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop(0);

    window.addEventListener("resize", resize);

    return () => {
      isActive = false;
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      if (rendererRef.current) {
        rendererRef.current.reset();
        rendererRef.current = null;
      }
      pointersRef.current = null;
    };
  }, []);

  return canvasRef;
};

// Reusable Hero Component
const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle1,
  subtitle2,
  subtitle3,
  buttons,
  socialButtons,
  className = "",
}) => {
  const canvasRef = useShaderBackground();

  return (
    <div
      className={`relative w-full h-screen overflow-hidden bg-black ${className}`}
    >
      <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        .animation-delay-1200 {
          animation-delay: 1.2s;
        }

        .animation-delay-1600 {
          animation-delay: 1.6;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-2400 {
          animation-delay: 2.4s;
        }

        .animation-delay-3000 {
          animation-delay: 3s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-4500 {
          animation-delay: 4.5s;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }

        .animation-delay-7000 {
          animation-delay: 7s;
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain touch-none"
        style={{ background: "black" }}
      />

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
        {/* Trust Badge */}
        {/* {trustBadge && (
          <div className="mb-8 animate-fade-in-down">
            <div className="flex items-center gap-2 px-6 py-3 bg-red-500/20 backdrop-blur-md border border-red-300/50 rounded-md text-sm">
              {trustBadge.icons && (
                <div className="flex">
                  {trustBadge.icons.map((icon, index) => (
                    <span key={index} className={`text-${index === 0 ? 'green' : index === 1 ? 'red' : 'amber'}-400`}>
                      {icon}
                    </span>
                  ))}
                </div>
              )}
              <span className="text-orange-100">{trustBadge.text}</span>
            </div>
          </div>
        )} */}

        <div className="text-center space-y-4 max-w-5xl mx-auto px-4">
          {/* Main Heading with Animation */}
          <div className="space-y-2">
            <h1 className="pb-2 text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-orange-600 bg-clip-text text-transparent animate-fade-in-up animation-delay-600">
              {headline.line1}
            </h1>
            <h1 className="pb-2 text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-700 via-red-600 to-orange-700 bg-clip-text text-transparent animate-fade-in-up animation-delay-800">
              {headline.line2}
            </h1>
          </div>

          {/* Subtitle with Animation */}
          <div className="max-w-3xl mx-auto animate-fade-in-up animation-delay-2400">
            <p className="mt-4 text-lg md:text-lg lg:text-xl text-orange-100/90 font-medium leading-relaxed">
              {subtitle1}
            </p>
            <p className="text-lg md:text-lg lg:text-xl text-orange-100/90 font-medium leading-relaxed">
              {subtitle2}
            </p>
            <p className="mb-6 text-lg md:text-lg lg:text-xl text-orange-100/90 font-medium leading-relaxed">
              {subtitle3}
            </p>
          </div>

          {/* CTA Buttons with Animation */}
          {buttons && buttons.primary && (
            <div className="flex-row flex-col space-x-4 gap-4 justify-center mt-10 animate-fade-in-up animation-delay-3000">
              <button
                onClick={buttons.primary.onClick}
                button_id={buttons.primary.buttonId}
                className="px-5 py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-slate-200 rounded-md font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25"
              >
                {buttons.primary.text}
              </button>
            </div>
          )}

          {/* Support Section */}
          <div className="py-3 flex flex-col items-center gap-3 mt-14 animate-fade-in-up animation-delay-4000">
            <p className="text-md font-medium text-gray-300 text-center max-w-md px-4">
              If you enjoyed the game, I would be very happy if you support me so I can continue
              to develop it.
            </p>
            <button
              onClick={() =>
                window.open(
                  "https://buymeacoffee.com/julez.b",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="px-5 py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-slate-200 rounded-md font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25"
            >
              <span>☕ </span>
              <span>Buy Me a Coffee</span>
            </button>
          </div>

          {/* Incremental DB Vote Section */}
          <div className="py-3 flex flex-col items-center gap-3 mt-8 animate-fade-in-up animation-delay-4500">
            <p className="text-md font-medium text-gray-300 text-center max-w-md px-4">
              You can support the game for free by leaving a vote or review on Incremental DB. It makes a huge difference. Thank you! ♡
            </p>
            <button
              onClick={() =>
                window.open(
                  "https://www.incrementaldb.com/game/a-dark-cave",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="px-5 py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-slate-200 rounded-md font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 flex items-center gap-2"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 26.488 29.926"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.4"
              >
                <g>
                  <path d="m10.613 2.168 1.11-.865a2.286 2.286 0 0 1 2.871 0l1.145.975M17.804 25.986l-2.946 2.531a2.7 2.7 0 0 1-3.4 0l-2.515-2.156M13.148 15.155v13.587M15.853 27.656l9.532-8.166M10.764 27.917.987 19.66M.987 19.66V7.194M25.385 19.66V7.775M3.625 9.196.987 7.194M22.87 9.603l2.638-1.998" strokeLinejoin="round"/>
                  <path strokeMiterlimit="10" d="m13.291 6.353 5.204 4.501M13.255 6.389l-5.034 4.213"/>
                </g>
              </svg>
              <span>Incremental DB</span>
            </button>
          </div>

          {/* Social, Feedback and Close Buttons */}
          {(socialButtons?.instagram || socialButtons?.reddit || buttons?.feedback || buttons?.secondary) && (
            <div className="flex justify-center gap-4 animate-fade-in-up animation-delay-4500">
              {socialButtons?.instagram && (
                <button
                  onClick={socialButtons.instagram.onClick}
                  className="px-4 py-2 bg-orange-500/10 hover:bg-red-500/20 border border-red-300/30 hover:border-red-300/50 text-slate-200 rounded-md font-normal text-md transition-all duration-300 hover:scale-105 backdrop-blur-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Instagram</span>
                </button>
              )}
              {socialButtons?.reddit && (
                <button
                  onClick={socialButtons.reddit.onClick}
                  className="px-4 py-2 bg-orange-500/10 hover:bg-red-500/20 border border-red-300/30 hover:border-red-300/50 text-slate-200 rounded-md font-normal text-md transition-all duration-300 hover:scale-105 backdrop-blur-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  <span>Reddit</span>
                </button>
              )}
              {buttons?.feedback && (
                <button
                  onClick={buttons.feedback.onClick}
                  button_id={buttons.feedback.buttonId}
                  className="px-4 py-2 bg-orange-500/10 hover:bg-red-500/20 border border-red-300/30 hover:border-red-300/50 text-slate-200 rounded-md font-normal text-md transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  {buttons.feedback.text}
                </button>
              )}
              {buttons?.secondary && (
                <button
                  onClick={buttons.secondary.onClick}
                  button_id={buttons.secondary.buttonId}
                  className="px-4 py-2 bg-orange-500/10 hover:bg-red-500/20 border border-red-300/30 hover:border-red-300/50 text-slate-200 rounded-md font-normal text-md transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const defaultShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

#define PRIMARY_COLOR vec3(0.7, 0.7, 0.7)
#define BACKGROUND_TINT vec3(0.025, 0.025, 0.025)

// COLOR DEVIATION - Controls how much colors can deviate from PRIMARY_COLOR
// Lower values = colors stay closer to defined colors (default: 1.0)
// 0.5 = subtle variation, 1.0 = moderate variation, 2.0 = high variation
#define MAX_COLOR_DEVIATION 1.5

// CLOUD COLOR DEVIATION - Controls how much the cloud color varies from BACKGROUND_TINT
// Lower values = clouds stay closer to BACKGROUND_TINT color (default: 1.0)
// 0.0 = no variation (pure BACKGROUND_TINT), 1.0 = normal variation, 2.0 = high variation
#define CLOUD_COLOR_DEVIATION 1.75

// Returns a pseudo random number for a given point (white noise)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
// Returns a pseudo random number for a given point (value noise)
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
// Returns a pseudo random number for a given point (fractal noise)
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}
// CLOUD SPEED - Adjust this value to change cloud movement speed
// Higher values = faster clouds (default: 0.5)
#define CLOUD_SPEED 0.1

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
	// Animate flame colors over time: red -> orange -> yellow
	vec3 flameColor1 = vec3(1.4, 0.1, 0.0);
	vec3 flameColor2 = vec3(1.8, 0.4, 0.1);
	vec3 flameColor3 = vec3(2.0, 0.6, 0.0);
	float colorPhase = sin(T * 0.8) * 0.5 + 0.5;
	vec3 col = mix(mix(flameColor1, flameColor2, colorPhase), flameColor3, sin(T * 0.5) * 0.5 + 0.5) * 1.3;
	float bg=clouds(vec2(st.x+T*CLOUD_SPEED,-st.y));
	uv*=1.-.3*(sin(T*.2)*.5+.5);
	for (float i=1.; i<12.; i++) {
		uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
		vec2 p=uv;
		float d=length(p);
		col+=.0015/d*(cos(sin(i))+1.);
		float b=noise(i+p+bg*2.8);
		col+=.002*MAX_COLOR_DEVIATION*b/length(max(p,vec2(b*p.x*.02,p.y)));
		vec3 cloudColor = BACKGROUND_TINT * (1.0 + (bg - 0.5) * CLOUD_COLOR_DEVIATION);
		col=mix(col,cloudColor,d);
	}
	O=vec4(col,1);
}`;

export default Hero;