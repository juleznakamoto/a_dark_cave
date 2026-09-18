import { useLayoutEffect } from "react";
import {
  ADC_CHROME_FROM_PROP,
  ADC_CHROME_PREV_STAGE_ATTR,
  ADC_CHROME_SOLID_PROP,
  ADC_CHROME_STAGE_ATTR,
  ADC_CHROME_STAGE_FADE_MS,
  ADC_CHROME_TO_PROP,
  chromeStageFadeWeights,
  chromeStageShouldDissolve,
  parseMadnessVisualStage,
  type MadnessVisualStage,
} from "@/game/madnessVisualStage";

const hairlineRafs = new WeakMap<HTMLElement, number>();

let fadeGeneration = 0;

const LEGACY_FADE_STYLE_ID = "adc-chrome-stage-fade";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clearHairlineRaf(el: HTMLElement): void {
  const existing = hairlineRafs.get(el);
  if (existing == null) return;
  window.cancelAnimationFrame(existing);
  hairlineRafs.delete(el);
}

function writeChromeFadeVars(
  el: HTMLElement,
  fromCrack: number,
  toCrack: number,
  solid: number,
): void {
  el.style.setProperty(ADC_CHROME_FROM_PROP, String(fromCrack));
  el.style.setProperty(ADC_CHROME_TO_PROP, String(toCrack));
  el.style.setProperty(ADC_CHROME_SOLID_PROP, String(solid));
}

function snapChromeVisualStage(
  el: HTMLElement,
  stage: MadnessVisualStage,
): void {
  el.setAttribute(ADC_CHROME_STAGE_ATTR, String(stage));
  if (stage === 0) {
    el.removeAttribute(ADC_CHROME_PREV_STAGE_ATTR);
  } else {
    // Keep prev URLs on the same tile as current so dropping the attr
    // cannot fall back to the stage-4 default for a frame.
    el.setAttribute(ADC_CHROME_PREV_STAGE_ATTR, String(stage));
  }
  writeChromeFadeVars(el, 0, stage === 0 ? 0 : 1, stage === 0 ? 1 : 0);
}

/** Write `data-adc-chrome-stage`. Stage changes crossfade tiles over 1000ms. */
export function applyChromeVisualStage(
  el: HTMLElement,
  stage: MadnessVisualStage,
): void {
  const from = parseMadnessVisualStage(el.getAttribute(ADC_CHROME_STAGE_ATTR));
  clearHairlineRaf(el);
  const generation = ++fadeGeneration;

  if (
    from == null ||
    !chromeStageShouldDissolve(from, stage) ||
    prefersReducedMotion()
  ) {
    snapChromeVisualStage(el, stage);
    return;
  }

  const fromStage = from;
  el.setAttribute(
    ADC_CHROME_PREV_STAGE_ATTR,
    String(fromStage === 0 ? stage : fromStage),
  );
  el.setAttribute(ADC_CHROME_STAGE_ATTR, String(stage));
  const startWeights = chromeStageFadeWeights(fromStage, stage, 0);
  writeChromeFadeVars(
    el,
    startWeights.fromCrack,
    startWeights.toCrack,
    startWeights.solid,
  );

  const started = performance.now();
  const tick = (now: number) => {
    if (generation !== fadeGeneration) return;
    const t = Math.min(1, (now - started) / ADC_CHROME_STAGE_FADE_MS);
    const weights = chromeStageFadeWeights(fromStage, stage, t);
    writeChromeFadeVars(el, weights.fromCrack, weights.toCrack, weights.solid);
    if (t < 1) {
      hairlineRafs.set(el, window.requestAnimationFrame(tick));
      return;
    }
    hairlineRafs.delete(el);
    snapChromeVisualStage(el, stage);
  };
  hairlineRafs.set(el, window.requestAnimationFrame(tick));
}

export function clearChromeVisualStage(el: HTMLElement): void {
  fadeGeneration += 1;
  clearHairlineRaf(el);
  el.removeAttribute(ADC_CHROME_STAGE_ATTR);
  el.removeAttribute(ADC_CHROME_PREV_STAGE_ATTR);
  el.style.removeProperty(ADC_CHROME_FROM_PROP);
  el.style.removeProperty(ADC_CHROME_TO_PROP);
  el.style.removeProperty(ADC_CHROME_SOLID_PROP);
}

/** SSOT for document-level chrome stage (game + animations demo slider). */
export function useDocumentChromeVisualStage(stage: MadnessVisualStage): void {
  useLayoutEffect(() => {
    applyChromeVisualStage(document.documentElement, stage);
  }, [stage]);

  useLayoutEffect(() => {
    return () => clearChromeVisualStage(document.documentElement);
  }, []);
}

if (typeof document !== "undefined") {
  document.getElementById(LEGACY_FADE_STYLE_ID)?.remove();
}
