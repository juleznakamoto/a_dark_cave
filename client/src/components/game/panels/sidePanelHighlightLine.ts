/** A gap in the highlight line, in pixels from the left of the word. */
export type HighlightLineHole = { start: number; end: number };

type GlyphMeasure = {
  width: number;
  descent: number;
  left: number;
  right: number;
};

/** Letters that reach the line (g, y, p, q, j) get a little clear space. */
const DESCENDER_MIN_PX = 1;
const LETTER_PAD_PX = 2;
/** Clear space on each side of the center dot. */
const DOT_GAP_PX = 4;

export function highlightLineHoles(
  text: string,
  measure: (char: string) => GlyphMeasure,
): HighlightLineHole[] {
  const holes: HighlightLineHole[] = [];
  let x = 0;
  for (const char of text) {
    const glyph = measure(char);
    if (glyph.descent >= DESCENDER_MIN_PX) {
      holes.push({
        start: x - glyph.left - LETTER_PAD_PX,
        end: x + glyph.right + LETTER_PAD_PX,
      });
    }
    x += glyph.width;
  }
  return holes;
}

export function mergeHighlightLineHoles(
  holes: HighlightLineHole[],
  width: number,
): HighlightLineHole[] {
  const clamped = holes
    .map((hole) => ({
      start: Math.max(0, hole.start),
      end: Math.min(width, hole.end),
    }))
    .filter((hole) => hole.end - hole.start > 0.5)
    .sort((a, b) => a.start - b.start);
  const merged: HighlightLineHole[] = [];
  for (const hole of clamped) {
    const previous = merged[merged.length - 1];
    if (previous && hole.start <= previous.end + 0.5) {
      previous.end = Math.max(previous.end, hole.end);
    } else {
      merged.push({ ...hole });
    }
  }
  return merged;
}

/** Fade at both ends, a gap for the dot, and a gap around each descending letter. */
export function buildHighlightLineGradient(
  width: number,
  fontSize: number,
  holes: HighlightLineHole[],
): string {
  const fade = Math.min(fontSize * 0.2, width * 0.1);
  const merged = mergeHighlightLineHoles(
    [...holes, { start: width / 2 - DOT_GAP_PX, end: width / 2 + DOT_GAP_PX }],
    width,
  );
  const px = (value: number) => `${Math.round(value * 10) / 10}px`;
  const stops = [`transparent 0px`, `currentColor ${px(fade)}`];
  let drawnTo = fade;
  for (const hole of merged) {
    const start = Math.max(hole.start, drawnTo);
    const end = Math.max(hole.end, start);
    if (start > drawnTo) stops.push(`currentColor ${px(start)}`);
    stops.push(`transparent ${px(start)}`);
    stops.push(`transparent ${px(end)}`);
    stops.push(`currentColor ${px(end)}`);
    drawnTo = end;
  }
  const fadeStart = Math.max(drawnTo, width - fade);
  stops.push(`currentColor ${px(fadeStart)}`);
  stops.push(`transparent ${px(width)}`);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function lineTarget(highlight: HTMLElement): HTMLElement {
  return (
    highlight.querySelector<HTMLElement>(":scope > .side-panel-name") ??
    highlight.querySelector<HTMLElement>(
      ":scope .inline-flex > span:not(.font-noto-symbols-2)",
    ) ??
    highlight
  );
}

let measureCanvas: HTMLCanvasElement | null = null;

/** Paint the highlight line for one highlighted name. */
export function paintSidePanelHighlightLine(highlight: HTMLElement): void {
  const target = lineTarget(highlight);
  const text = target.textContent ?? "";
  const width = target.getBoundingClientRect().width;
  if (width <= 0 || text.length === 0) return;
  const font = getComputedStyle(target).font;
  const fontSize = parseFloat(getComputedStyle(target).fontSize) || 12;
  measureCanvas ??= document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  if (!context) return;
  context.font = font;
  let measuredWidth = 0;
  const holes = highlightLineHoles(text, (char) => {
    const glyph = context.measureText(char);
    measuredWidth += glyph.width;
    return {
      width: glyph.width,
      descent: glyph.actualBoundingBoxDescent ?? 0,
      left: glyph.actualBoundingBoxLeft ?? 0,
      right: glyph.actualBoundingBoxRight ?? glyph.width,
    };
  });
  const scale = measuredWidth > 0 ? width / measuredWidth : 1;
  target.style.backgroundImage = buildHighlightLineGradient(
    width,
    fontSize,
    holes.map((hole) => ({
      start: hole.start * scale,
      end: hole.end * scale,
    })),
  );
}
