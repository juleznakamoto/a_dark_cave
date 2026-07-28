import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  createElement,
  memo,
} from "react";
import { logger } from "@/lib/logger";

export enum Tag {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  P = "p",
}

type AnimationState = "static" | "vaporizing" | "fadingIn" | "waiting" | "done";

type VaporizeTextCycleProps = {
  texts: string[];
  font?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number;
    letterSpacing?: string;
  };
  color?: string;
  spread?: number;
  density?: number;
  animation?: {
    vaporizeDuration?: number;
    fadeInDuration?: number;
    waitDuration?: number;
  };
  direction?: "left-to-right" | "right-to-left";
  alignment?: "left" | "center" | "right";
  tag?: Tag | "h1" | "h2" | "h3" | "p";
  /** When false, stops after the last text vaporises (no fade-in / loop). Default true. */
  loop?: boolean;
  /** When false, keeps a static particle render and does not vaporize yet. Default true. */
  play?: boolean;
  /** Fires once after the first canvas sample + paint (for seamless DOM→canvas handoff). */
  onReady?: () => void;
  /**
   * DOM node to pixel-align with (alphabetic baseline + left edge).
   * Use this for start-screen handoff so canvas text does not jump.
   */
  matchSource?: HTMLElement | null;
};

type Particle = {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  color: string;
  opacity: number;
  originalAlpha: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  shouldFadeQuickly?: boolean;
};

type TextBoundaries = {
  left: number;
  right: number;
  width: number;
};

/**
 * Canvas particle vaporize text. Sampling only runs when size/text/font change —
 * never on animation-state transitions (that was resetting particles every frame).
 */
export default function VaporizeTextCycle({
  texts = ["Next.js", "React"],
  font = {
    fontFamily: "sans-serif",
    fontSize: "50px",
    fontWeight: 400,
  },
  color = "rgb(255, 255, 255)",
  spread = 5,
  density = 5,
  animation = {
    vaporizeDuration: 2,
    fadeInDuration: 1,
    waitDuration: 0.5,
  },
  direction = "left-to-right",
  alignment = "center",
  tag = Tag.P,
  loop = true,
  play = true,
  onReady,
  matchSource = null,
}: VaporizeTextCycleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const textBoundariesRef = useRef<TextBoundaries | null>(null);
  const vaporizeProgressRef = useRef(0);
  const fadeOpacityRef = useRef(0);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTextIndexRef = useRef(0);
  const animationStateRef = useRef<AnimationState>("static");
  const wrapperSizeRef = useRef({ width: 0, height: 0 });
  const sampledKeyRef = useRef<string>("");
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const matchSourceRef = useRef(matchSource);
  matchSourceRef.current = matchSource;

  const propsRef = useRef({
    texts,
    font,
    color,
    spread,
    density,
    animation,
    direction,
    alignment,
    loop,
    play,
  });
  propsRef.current = {
    texts,
    font,
    color,
    spread,
    density,
    animation,
    direction,
    alignment,
    loop,
    play,
  };

  const isInView = useIsInView(wrapperRef as React.RefObject<HTMLElement>);
  const [, setRenderTick] = useState(0);
  const bump = () => setRenderTick((n) => n + 1);

  const setAnimationState = (next: AnimationState) => {
    if (animationStateRef.current === next) return;
    animationStateRef.current = next;
    // Only needed so "done" can skip empty work; avoid re-renders during vaporize.
    if (next === "done" || next === "static") bump();
  };

  const globalDpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const solidTextRef = useRef<{
    text: string;
    textX: number;
    textY: number;
    font: string;
    color: string;
    alignment: "left" | "center" | "right";
    letterSpacing: string;
    textBaseline: CanvasTextBaseline;
  } | null>(null);

  const sampleCanvas = (width: number, height: number, textIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1 || height < 1) return;

    const {
      texts: textList,
      font: fontProp,
      color: colorProp,
      alignment: align,
    } = propsRef.current;

    const fontSize = parseFloat(fontProp.fontSize?.replace("px", "") || "50");
    const letterSpacing = fontProp.letterSpacing ?? "0px";
    const matchEl = matchSourceRef.current;
    const key = [
      Math.round(width),
      Math.round(height),
      textIndex,
      textList[textIndex] ?? "",
      fontProp.fontFamily,
      fontSize,
      fontProp.fontWeight,
      letterSpacing,
      colorProp,
      align,
      globalDpr,
      matchEl ? "match" : "free",
    ].join("|");

    // Skip identical re-samples — prevents mid-animation particle resets.
    if (key === sampledKeyRef.current && particlesRef.current.length > 0) {
      return;
    }
    sampledKeyRef.current = key;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.floor(width * globalDpr);
    canvas.height = Math.floor(height * globalDpr);

    const fontStr = `${fontProp.fontWeight ?? 400} ${fontSize * globalDpr}px ${fontProp.fontFamily ?? "sans-serif"}`;
    const parsedColor = parseColor(colorProp ?? "rgb(153, 153, 153)");
    const currentText = textList[textIndex] || "";
    const letterSpacingCanvas = scaleCssLength(letterSpacing, globalDpr);

    let textX: number;
    let textY: number;
    let drawAlign: "left" | "center" | "right" = align || "left";
    let textBaseline: CanvasTextBaseline = "middle";

    const matched = matchEl
      ? measureDomTextAnchor(matchEl, canvas)
      : null;

    if (matched) {
      // Pin to the live DOM glyph box — avoids middle-baseline jump on handoff.
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / Math.max(1, canvasRect.width);
      const scaleY = canvas.height / Math.max(1, canvasRect.height);
      textX = matched.textX * scaleX;
      textY = matched.textY * scaleY;
      drawAlign = "left";
      textBaseline = "alphabetic";
    } else {
      textY = canvas.height / 2;
      if (align === "center") textX = canvas.width / 2;
      else if (align === "left") textX = 0;
      else textX = canvas.width;
    }

    solidTextRef.current = {
      text: currentText,
      textX,
      textY,
      font: fontStr,
      color: parsedColor,
      alignment: drawAlign,
      letterSpacing: letterSpacingCanvas,
      textBaseline,
    };

    const { particles, textBoundaries } = createParticles(
      ctx,
      canvas,
      currentText,
      textX,
      textY,
      fontStr,
      parsedColor,
      drawAlign,
      letterSpacingCanvas,
      textBaseline,
    );

    particlesRef.current = particles;
    textBoundariesRef.current = textBoundaries;
  };

  const paintSolidText = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const solid = solidTextRef.current;
    if (!canvas || !ctx || !solid) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSolidText(ctx, solid);
  };

  const paintStaticFrame = () => {
    // Solid fillText matches DOM width/weight; particles alone look thinner.
    paintSolidText();
  };

  const notifyReady = () => {
    if (readyFiredRef.current) return;
    if (!particlesRef.current.length) return;
    readyFiredRef.current = true;
    onReadyRef.current?.();
  };

  // Measure wrapper once + on real size changes (ignore sub-pixel thrash).
  // useLayoutEffect so the first paint already has sampled particles (no blank flash).
  useLayoutEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;

    const applySize = (width: number, height: number) => {
      const prev = wrapperSizeRef.current;
      const w = Math.round(width);
      const h = Math.round(height);
      if (w === Math.round(prev.width) && h === Math.round(prev.height)) return;
      wrapperSizeRef.current = { width, height };
      if (animationStateRef.current !== "done") {
        sampleCanvas(width, height, currentTextIndexRef.current);
        paintStaticFrame();
        notifyReady();
      }
    };

    const rect = container.getBoundingClientRect();
    applySize(rect.width, rect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sample via refs
  }, []);

  // Re-sample when text content / font / color props actually change.
  const textsKey = texts.join("\0");
  const fontKey = `${font.fontFamily}|${font.fontSize}|${font.fontWeight}|${font.letterSpacing ?? ""}`;
  useEffect(() => {
    if (animationStateRef.current === "done") return;
    const { width, height } = wrapperSizeRef.current;
    sampleCanvas(width, height, currentTextIndexRef.current);
    paintStaticFrame();
    notifyReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textsKey, fontKey, color, alignment, density, spread]);

  // Start vaporizing only when in view AND play is true (handoff can finish first).
  useEffect(() => {
    if (isInView && play) {
      if (animationStateRef.current === "done") return;
      vaporizeProgressRef.current = 0;
      setAnimationState("vaporizing");
    } else if (!play && animationStateRef.current !== "done") {
      vaporizeProgressRef.current = 0;
      resetParticles(particlesRef.current);
      animationStateRef.current = "static";
      paintStaticFrame();
    } else if (!isInView) {
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
      setAnimationState("static");
    }
  }, [isInView, play]);

  // Single stable rAF loop — reads state from refs so it never tears down mid-vaporize.
  useEffect(() => {
    if (!isInView) return;

    let frameId = 0;
    let lastTime = performance.now();
    let running = true;

    const animate = (currentTime: number) => {
      if (!running) return;

      const deltaTime = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const state = animationStateRef.current;

      if (!canvas || !ctx) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      if (state === "done") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const {
        animation: anim,
        direction: dir,
        spread: spreadProp,
        density: densityProp,
        loop: shouldLoop,
        texts: textList,
        font: fontProp,
      } = propsRef.current;

      const VAPORIZE_DURATION = (anim.vaporizeDuration ?? 2) * 1000;
      const FADE_IN_DURATION = (anim.fadeInDuration ?? 1) * 1000;
      const WAIT_DURATION = (anim.waitDuration ?? 0.5) * 1000;
      const fontSize = parseFloat(fontProp.fontSize?.replace("px", "") || "50");
      const multipliedSpread = calculateVaporizeSpread(fontSize) * spreadProp;
      const transformedDensity = transformValue(
        densityProp,
        [0, 10],
        [0.3, 1],
        true,
      );

      if (!particlesRef.current.length) {
        // Still waiting for first sample.
        frameId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      switch (state) {
        case "static": {
          paintSolidText();
          break;
        }
        case "vaporizing": {
          vaporizeProgressRef.current +=
            (deltaTime * 100) / (VAPORIZE_DURATION / 1000);

          const textBoundaries = textBoundariesRef.current;
          if (!textBoundaries) break;

          const progress = Math.min(100, vaporizeProgressRef.current);
          const vaporizeX =
            dir === "left-to-right"
              ? textBoundaries.left + (textBoundaries.width * progress) / 100
              : textBoundaries.right - (textBoundaries.width * progress) / 100;

          const allVaporized = updateParticles(
            particlesRef.current,
            vaporizeX,
            deltaTime,
            multipliedSpread,
            VAPORIZE_DURATION,
            dir,
            transformedDensity,
          );

          // Keep crisp fillText on the untouched side so width matches the DOM.
          paintSolidText();
          if (dir === "left-to-right") {
            ctx.clearRect(0, 0, Math.ceil(vaporizeX), canvas.height);
          } else {
            ctx.clearRect(
              Math.floor(vaporizeX),
              0,
              canvas.width - Math.floor(vaporizeX),
              canvas.height,
            );
          }
          renderParticles(ctx, particlesRef.current, vaporizeX, dir);

          if (vaporizeProgressRef.current >= 100 && allVaporized) {
            const isLastText =
              currentTextIndexRef.current >= textList.length - 1;
            if (!shouldLoop && isLastText) {
              particlesRef.current = [];
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              setAnimationState("done");
              return;
            }
            currentTextIndexRef.current =
              (currentTextIndexRef.current + 1) % textList.length;
            sampledKeyRef.current = "";
            sampleCanvas(
              wrapperSizeRef.current.width,
              wrapperSizeRef.current.height,
              currentTextIndexRef.current,
            );
            fadeOpacityRef.current = 0;
            animationStateRef.current = "fadingIn";
          }
          break;
        }
        case "fadingIn": {
          fadeOpacityRef.current += (deltaTime * 1000) / FADE_IN_DURATION;

          ctx.save();
          particlesRef.current.forEach((particle) => {
            particle.x = particle.originalX;
            particle.y = particle.originalY;
            const opacity =
              Math.min(fadeOpacityRef.current, 1) * particle.originalAlpha;
            ctx.fillStyle = particle.color.replace(
              /[\d.]+\)$/,
              `${opacity})`,
            );
            ctx.fillRect(particle.x, particle.y, 1, 1);
          });
          ctx.restore();

          if (fadeOpacityRef.current >= 1) {
            animationStateRef.current = "waiting";
            if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
            waitTimeoutRef.current = setTimeout(() => {
              vaporizeProgressRef.current = 0;
              resetParticles(particlesRef.current);
              animationStateRef.current = "vaporizing";
            }, WAIT_DURATION);
          }
          break;
        }
        case "waiting": {
          paintSolidText();
          break;
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable loop via refs
  }, [isInView, globalDpr]);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      style={{ pointerEvents: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: "none" }}
      />
      <SeoElement tag={tag} texts={texts} />
    </div>
  );
}

const SeoElement = memo(function SeoElement({
  tag = Tag.P,
  texts,
}: {
  tag: Tag | "h1" | "h2" | "h3" | "p";
  texts: string[];
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
    userSelect: "none",
    pointerEvents: "none",
  };
  const allowed = new Set(["h1", "h2", "h3", "p"]);
  const safeTag = allowed.has(tag) ? tag : "p";
  return createElement(safeTag, { style }, texts?.join(" ") ?? "");
});

const createParticles = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  textX: number,
  textY: number,
  font: string,
  color: string,
  alignment: "left" | "center" | "right",
  letterSpacing = "0px",
  textBaseline: CanvasTextBaseline = "middle",
) => {
  const particles: Particle[] = [];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyTextStyle(ctx, {
    font,
    color,
    alignment,
    letterSpacing,
  });
  ctx.textBaseline = textBaseline;
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = true;

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  let textLeft: number;
  if (alignment === "center") textLeft = textX - textWidth / 2;
  else if (alignment === "left") textLeft = textX;
  else textLeft = textX - textWidth;

  const textBoundaries = {
    left: textLeft,
    right: textLeft + textWidth,
    width: textWidth,
  };

  ctx.fillText(text, textX, textY);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // Sample every pixel so the at-rest glyph matches DOM weight/width.
  const sampleRate = 1;

  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];
      if (alpha > 0) {
        const originalAlpha = alpha / 255;
        particles.push({
          x,
          y,
          originalX: x,
          originalY: y,
          color: `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${originalAlpha})`,
          opacity: originalAlpha,
          originalAlpha,
          velocityX: 0,
          velocityY: 0,
          angle: 0,
          speed: 0,
        });
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { particles, textBoundaries };
};

const applyTextStyle = (
  ctx: CanvasRenderingContext2D,
  {
    font,
    color,
    alignment,
    letterSpacing,
  }: {
    font: string;
    color: string;
    alignment: "left" | "center" | "right";
    letterSpacing: string;
  },
) => {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = alignment;
  if ("letterSpacing" in ctx) {
    (
      ctx as CanvasRenderingContext2D & { letterSpacing: string }
    ).letterSpacing = letterSpacing;
  }
};

const drawSolidText = (
  ctx: CanvasRenderingContext2D,
  solid: {
    text: string;
    textX: number;
    textY: number;
    font: string;
    color: string;
    alignment: "left" | "center" | "right";
    letterSpacing: string;
    textBaseline: CanvasTextBaseline;
  },
) => {
  applyTextStyle(ctx, solid);
  ctx.textBaseline = solid.textBaseline;
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = true;
  ctx.fillText(solid.text, solid.textX, solid.textY);
};

/**
 * Measure a DOM text node's left edge + alphabetic baseline relative to a canvas
 * (CSS pixel space). Used so canvas fillText can sit on the same glyphs.
 */
function measureDomTextAnchor(
  matchEl: HTMLElement,
  canvas: HTMLCanvasElement,
): { textX: number; textY: number } | null {
  const canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width < 1 || canvasRect.height < 1) return null;

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;";
  matchEl.appendChild(probe);
  const baseline = probe.getBoundingClientRect().top;
  matchEl.removeChild(probe);

  const matchRect = matchEl.getBoundingClientRect();
  return {
    textX: matchRect.left - canvasRect.left,
    textY: baseline - canvasRect.top,
  };
}

/** Scale a CSS length (px/em) by DPR for canvas bitmap space. */
function scaleCssLength(value: string, dpr: number): string {
  if (!value || value === "normal") return "0px";
  const pxMatch = value.trim().match(/^(-?[\d.]+)px$/i);
  if (pxMatch) {
    return `${parseFloat(pxMatch[1]) * dpr}px`;
  }
  return value;
}

const updateParticles = (
  particles: Particle[],
  vaporizeX: number,
  deltaTime: number,
  MULTIPLIED_VAPORIZE_SPREAD: number,
  VAPORIZE_DURATION: number,
  direction: string,
  density: number,
) => {
  let allParticlesVaporized = true;

  for (const particle of particles) {
    const shouldVaporize =
      direction === "left-to-right"
        ? particle.originalX <= vaporizeX
        : particle.originalX >= vaporizeX;

    if (!shouldVaporize) {
      allParticlesVaporized = false;
      continue;
    }

    if (particle.speed === 0) {
      particle.angle = Math.random() * Math.PI * 2;
      particle.speed = (Math.random() * 1 + 0.5) * MULTIPLIED_VAPORIZE_SPREAD;
      particle.velocityX = Math.cos(particle.angle) * particle.speed;
      particle.velocityY = Math.sin(particle.angle) * particle.speed;
      particle.shouldFadeQuickly = Math.random() > density;
    }

    if (particle.shouldFadeQuickly) {
      particle.opacity = Math.max(0, particle.opacity - deltaTime);
    } else {
      const dx = particle.originalX - particle.x;
      const dy = particle.originalY - particle.y;
      const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy);
      const dampingFactor = Math.max(
        0.95,
        1 - distanceFromOrigin / (100 * MULTIPLIED_VAPORIZE_SPREAD),
      );
      const randomSpread = MULTIPLIED_VAPORIZE_SPREAD * 3;
      const spreadX = (Math.random() - 0.5) * randomSpread;
      const spreadY = (Math.random() - 0.5) * randomSpread;

      particle.velocityX =
        (particle.velocityX + spreadX + dx * 0.002) * dampingFactor;
      particle.velocityY =
        (particle.velocityY + spreadY + dy * 0.002) * dampingFactor;

      const maxVelocity = MULTIPLIED_VAPORIZE_SPREAD * 2;
      const currentVelocity = Math.sqrt(
        particle.velocityX * particle.velocityX +
        particle.velocityY * particle.velocityY,
      );
      if (currentVelocity > maxVelocity) {
        const scale = maxVelocity / currentVelocity;
        particle.velocityX *= scale;
        particle.velocityY *= scale;
      }

      particle.x += particle.velocityX * deltaTime * 20;
      particle.y += particle.velocityY * deltaTime * 10;

      const durationBasedFadeRate = 0.25 * (2000 / VAPORIZE_DURATION);
      particle.opacity = Math.max(
        0,
        particle.opacity - deltaTime * durationBasedFadeRate,
      );
    }

    if (particle.opacity > 0.01) {
      allParticlesVaporized = false;
    }
  }

  return allParticlesVaporized;
};

const renderParticles = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  vaporizeX?: number,
  direction?: string,
) => {
  for (const particle of particles) {
    if (particle.opacity <= 0) continue;
    if (vaporizeX != null && direction) {
      const reached =
        direction === "left-to-right"
          ? particle.originalX <= vaporizeX
          : particle.originalX >= vaporizeX;
      if (!reached) continue;
    }
    ctx.fillStyle = particle.color.replace(
      /[\d.]+\)$/,
      `${particle.opacity})`,
    );
    ctx.fillRect(particle.x, particle.y, 1, 1);
  }
};

const resetParticles = (particles: Particle[]) => {
  for (const particle of particles) {
    particle.x = particle.originalX;
    particle.y = particle.originalY;
    particle.opacity = particle.originalAlpha;
    particle.speed = 0;
    particle.velocityX = 0;
    particle.velocityY = 0;
  }
};

const calculateVaporizeSpread = (fontSize: number) => {
  const size = typeof fontSize === "string" ? parseInt(fontSize) : fontSize;
  const points = [
    { size: 20, spread: 0.2 },
    { size: 50, spread: 0.5 },
    { size: 100, spread: 1.5 },
  ];
  if (size <= points[0].size) return points[0].spread;
  if (size >= points[points.length - 1].size)
    return points[points.length - 1].spread;
  let i = 0;
  while (i < points.length - 1 && points[i + 1].size < size) i++;
  const p1 = points[i];
  const p2 = points[i + 1];
  return (
    p1.spread +
    ((size - p1.size) * (p2.spread - p1.spread)) / (p2.size - p1.size)
  );
};

const parseColor = (color: string) => {
  const rgbaMatch = color.match(
    /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/,
  );
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }
  logger.warn("Could not parse color:", color);
  return "rgba(0, 0, 0, 1)";
};

function transformValue(
  input: number,
  inputRange: number[],
  outputRange: number[],
  clamp = false,
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;
  const progress = (input - inputMin) / (inputMax - inputMin);
  let result = outputMin + progress * (outputMax - outputMin);
  if (clamp) {
    if (outputMax > outputMin) {
      result = Math.min(Math.max(result, outputMin), outputMax);
    } else {
      result = Math.min(Math.max(result, outputMax), outputMin);
    }
  }
  return result;
}

function useIsInView(ref: React.RefObject<HTMLElement>) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0, rootMargin: "50px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return isInView;
}
