import React, { useRef, useEffect } from "react";
import { logger } from "@/lib/logger";
import { StarshipShader } from "@/components/ui/starship-shader";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { OFFICIAL_STEAM_URL } from "@/lib/gameFooterSocialLinks";

export type EndScreenBackgroundVariant = "default" | "starship";

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
      /** Small pill at the upper-right of the primary CTA (e.g. end screen promo). */
      badge?: string;
    };
    secondary?: {
      text: string;
      onClick?: () => void;
      buttonId?: string;
    };
    /** Shown to the right of `secondary` on the same row (e.g. end screen: More Games). */
    secondaryTrailing?: {
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
  /** Default flame shader; `starship` for Cruel Mode completion end screen. */
  backgroundVariant?: EndScreenBackgroundVariant;
  className?: string;
}

/** Split "⛤ Cruel Mode" into a Noto symbol span + default-font label. */
function renderSymbolLabelButtonContent(text: string) {
  const parts = text.match(/^(\S+)\s+(.*)$/);
  if (!parts) return text;
  return (
    <>
      <span
        className="font-noto-symbols-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-base sm:text-lg leading-none"
        aria-hidden
      >
        {parts[1]}
      </span>
      <span>{parts[2]}</span>
    </>
  );
}

const END_SCREEN_CTA_BUTTON_CLASS =
  "px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-slate-200 rounded-md font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap";

const END_SCREEN_CTA_BUTTON_GROUP_CLASS =
  "px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-red-800 to-red-700 group-hover:from-red-700 group-hover:to-red-600 text-slate-200 rounded-md font-semibold text-base sm:text-lg transition-all duration-300 inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap";

const END_SCREEN_LINK_BUTTON_CLASS =
  "px-2.5 sm:px-3 py-1.5 sm:py-1.5 bg-orange-500/10 hover:bg-red-500/20 border border-red-300/30 hover:border-red-300/50 text-slate-200 rounded-md font-normal text-xs sm:text-sm transition-all duration-300 hover:scale-105 backdrop-blur-sm flex items-center gap-1 sm:gap-1.5 min-w-0";

/** Icon + label for compact end-screen buttons (icon box matches w-3.5 SVG icons). */
function renderEmojiLabelButtonContent(emoji: string, label: string) {
  return (
    <>
      <span
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-sm leading-none"
        aria-hidden
      >
        {emoji}
      </span>
      <span>{label}</span>
    </>
  );
}

// Reusable Shader Background Hook
const useShaderBackground = (enabled: boolean) => {
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
    if (!enabled || !canvasRef.current) return;

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
  }, [enabled]);

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
  backgroundVariant = "default",
  className = "",
}) => {
  const useDefaultBackground = backgroundVariant === "default";
  const canvasRef = useShaderBackground(useDefaultBackground);

  return (
    <div
      className={`relative w-full min-h-screen h-screen overflow-y-auto overflow-x-hidden bg-black ${className}`}
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

      {useDefaultBackground ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover min-h-full touch-none pointer-events-none"
          style={{ background: "black" }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 min-h-full w-full">
          <StarshipShader className="h-full w-full" />
        </div>
      )}

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white w-full min-w-0 overflow-x-hidden">
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

        <div className="text-center space-y-4 w-full max-w-[min(100vw,64rem)] mx-auto px-6 sm:px-8 min-w-0 box-border py-6 sm:py-0">
          {/* Main Heading with Animation */}
          <div className="space-y-2 min-w-0">
            <h1 className="pb-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-orange-600 bg-clip-text text-transparent animate-fade-in-up animation-delay-600 break-words">
              {headline.line1}
            </h1>
            <h1 className="pb-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-700 via-red-600 to-orange-700 bg-clip-text text-transparent animate-fade-in-up animation-delay-800 break-words">
              {headline.line2}
            </h1>
          </div>

          {/* Subtitle with Animation */}
          {(subtitle1 || subtitle2 || subtitle3) && (
            <div className="w-full max-w-3xl mx-auto animate-fade-in-up animation-delay-2400 min-w-0">
              {subtitle1 ? (
                <p className="mt-4 text-base sm:text-lg lg:text-xl text-grey-200 font-medium leading-relaxed break-words">
                  {subtitle1}
                </p>
              ) : null}
              {subtitle2 ? (
                <p className="text-base sm:text-lg lg:text-xl text-grey-200 font-medium leading-relaxed break-words">
                  {subtitle2}
                </p>
              ) : null}
              {subtitle3 ? (
                <p className="mb-6 text-base sm:text-lg lg:text-xl text-grey-200 font-medium leading-relaxed break-words">
                  {subtitle3}
                </p>
              ) : null}
            </div>
          )}

          {/* CTA Buttons with Animation */}
          {buttons && buttons.primary && (
            <div className="flex flex-wrap justify-center gap-4 mt-10 animate-fade-in-up animation-delay-3000">
              <div className="group relative inline-block transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_10px_25px_rgba(239,68,68,0.25)]">
                {buttons.primary.badge && (
                  <span className="pointer-events-none absolute -top-2.5 -right-2 z-10 max-w-[min(12rem,calc(100vw-4rem))] rounded border border-emerald-500/90 bg-emerald-950/95 px-2 py-0.5 text-center text-2xs font-semibold uppercase leading-tight tracking-wide text-emerald-300 shadow-md sm:text-xs">
                    {buttons.primary.badge}
                  </span>
                )}
                <button
                  onClick={buttons.primary.onClick}
                  button_id={buttons.primary.buttonId}
                  className={END_SCREEN_CTA_BUTTON_GROUP_CLASS}
                >
                  {renderSymbolLabelButtonContent(buttons.primary.text)}
                </button>
              </div>
            </div>
          )}

          {/* Support Section */}
          <div className="py-3 flex flex-col items-center gap-3 mt-14 animate-fade-in-up animation-delay-4000 w-full min-w-0">
            <p className="text-sm sm:text-base font-medium text-grey-200 text-center max-w-md px-2 sm:px-4 break-words">
              If you enjoyed the game, I would be very happy if you support me
              so I can continue to develop it.
            </p>
            <button
              onClick={() =>
                window.open(
                  "https://buymeacoffee.com/julez.b",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className={END_SCREEN_CTA_BUTTON_CLASS}
            >
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base sm:text-lg leading-none"
                aria-hidden
              >
                ☕
              </span>
              <span>Buy Me a Coffee</span>
            </button>
          </div>

          {/* Steam Wishlist Section */}
          <div className="py-3 flex flex-col items-center gap-3 mt-8 animate-fade-in-up animation-delay-4500 w-full min-w-0">
            <p className="text-sm sm:text-base font-medium text-grey-200 text-center max-w-md px-2 sm:px-4 break-words">
              A Dark Cave is soon launching on Steam. Add it to your wishlist
              today so you'll be notified the moment it launches.
            </p>
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center px-2">
              <button
                onClick={() =>
                  window.open(OFFICIAL_STEAM_URL, "_blank", "noopener,noreferrer")
                }
                className={END_SCREEN_CTA_BUTTON_CLASS}
              >
                <FooterSocialIcon
                  platform="steam"
                  className="h-5 w-5 shrink-0"
                />
                <span>Steam</span>
              </button>
            </div>
          </div>

          {/* Continue Playing and Social Links */}
          {(buttons?.feedback ||
            buttons?.secondary ||
            buttons?.secondaryTrailing) && (
              <div className="flex flex-col items-center gap-4 animate-fade-in-up animation-delay-4500 px-2">
                {buttons?.secondary && (
                  <div className="w-full flex justify-center">
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 items-center">
                      {buttons.secondaryTrailing && (
                        <button
                          type="button"
                          onClick={buttons.secondaryTrailing.onClick}
                          button_id={buttons.secondaryTrailing.buttonId}
                          className={END_SCREEN_LINK_BUTTON_CLASS}
                        >
                          {renderEmojiLabelButtonContent("🎮", buttons.secondaryTrailing.text)}
                        </button>
                      )}
                      <button
                        onClick={buttons.secondary.onClick}
                        button_id={buttons.secondary.buttonId}
                        className={END_SCREEN_LINK_BUTTON_CLASS}
                      >
                        {renderEmojiLabelButtonContent("▶", buttons.secondary.text)}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-2">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        "https://a-dark-cave.itch.io/a-dark-cave",
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className={END_SCREEN_LINK_BUTTON_CLASS}
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 210 210"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M38 26.25l-23 27v7.687c0 9.747 8.96 18.313 17.094 18.313 9.767 0 17.905-8.233 17.906-18 0 9.767 7.857 18 17.625 18S85 71.017 85 61.25c0 9.767 8.357 18 18.125 18 9.766 0 17.875-8.233 17.875-18 0 9.767 7.89 18 17.656 18 9.768 0 17.344-8.233 17.344-18 0 9.767 8.39 18 18.156 18 9.768 0 17.844-8.233 17.844-18v-8l-25-27c-43.646-.116-129 0-129 0z"
                      />
                      <path d="M50.006 74.75c-.93 1.66-2.224 3.08-3.563 4.412C42.757 82.828 37.672 85.1 32.1 85.1c-1.434 0-5.094-.845-5.094-.845v100h154V83.693c-2.3.904-4.234 1.406-6.844 1.406-5.577 0-10.656-2.27-14.344-5.938-1.336-1.332-2.477-2.843-3.406-4.5-.93 1.66-2.1 3.166-3.437 4.5-3.688 3.663-8.74 5.937-14.313 5.937-5.575 0-10.657-2.27-14.344-5.938-1.336-1.332-2.508-2.844-3.437-4.5-.93 1.66-2.065 3.166-3.405 4.5-3.688 3.663-8.77 5.937-14.344 5.937s-10.656-2.27-14.343-5.938c-1.337-1.33-2.477-2.844-3.406-4.5-.93 1.66-2.095 3.167-3.436 4.5C78.257 82.828 73.2 85.1 67.63 85.1c-5.574 0-10.656-2.27-14.343-5.938-1.336-1.33-2.35-2.756-3.28-4.412zm22.15 18.475c6.717 0 11.495 4.35 13.188 10.906h37.125c1.69-6.556 6.437-10.905 13.155-10.905 10.67 0 22.4 10.956 26.062 24.344l8.75 31.968c3.663 13.387-2.08 24.343-12.75 24.343-9.367 0-19.55-8.44-24.375-19.56H74.468c-4.824 11.12-15.006 19.56-24.374 19.56-10.672 0-16.413-10.955-12.75-24.343l8.75-31.968c3.662-13.39 15.39-24.345 26.062-24.345z" />
                      <path d="M90.743 121.55L78.205 135h12.352v13.866h24.625V135h13.174l-12.54-13.45-12.536-13.45z" />
                    </svg>
                    <span>itch.io</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        "https://www.incrementaldb.com/game/a-dark-cave",
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className={END_SCREEN_LINK_BUTTON_CLASS}
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 26.488 29.926"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.4"
                      aria-hidden
                    >
                      <g>
                        <path
                          d="m10.613 2.168 1.11-.865a2.286 2.286 0 0 1 2.871 0l1.145.975M17.804 25.986l-2.946 2.531a2.7 2.7 0 0 1-3.4 0l-2.515-2.156M13.148 15.155v13.587M15.853 27.656l9.532-8.166M10.764 27.917.987 19.66M.987 19.66V7.194M25.385 19.66V7.775M3.625 9.196.987 7.194M22.87 9.603l2.638-1.998"
                          strokeLinejoin="round"
                        />
                        <path
                          strokeMiterlimit="10"
                          d="m13.291 6.353 5.204 4.501M13.255 6.389l-5.034 4.213"
                        />
                      </g>
                    </svg>
                    <span>Incremental DB</span>
                  </button>
                  {buttons?.feedback && (
                    <button
                      onClick={buttons.feedback.onClick}
                      button_id={buttons.feedback.buttonId}
                      className={END_SCREEN_LINK_BUTTON_CLASS}
                    >
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                      <span>{buttons.feedback.text}</span>
                    </button>
                  )}
                </div>
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
	// Stretch UV vertically so the flame/cloud effect reaches further toward top and bottom
	vec2 uv=(FC-.5*R)/MN;
	uv.y *= 1.0;
	vec2 st=uv*vec2(2,1);
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
		col+=.0012/d*(cos(sin(i))+1.0);
		float b=noise(i+p+bg*2.5);
		col+=.0007*MAX_COLOR_DEVIATION*b/length(max(p,vec2(b*p.x*.02,p.y)));
		vec3 cloudColor = BACKGROUND_TINT * (1.0 + (bg - 0.5) * CLOUD_COLOR_DEVIATION);
		col=mix(col,cloudColor,d);
	}
	O=vec4(col,1);
}`;

export default Hero;
