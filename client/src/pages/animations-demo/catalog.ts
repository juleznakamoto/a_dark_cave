import type { ComponentType } from "react";
import {
  EstateBarsSection,
  ImproveButtonSection,
  InsightBadgeSection,
} from "@/pages/animations-demo/sectionEstate";
import {
  ButtonParticlesSection,
  CooldownWashSection,
  HoverParticlesSection,
} from "@/pages/animations-demo/sectionParticles";
import { ProgressBarsSection } from "@/pages/animations-demo/sectionProgress";
import {
  AttackWavesBarSection,
  SharedProgressShaderSection,
} from "@/pages/animations-demo/sectionSharedProgressShader";
import { CssEffectsSection } from "@/pages/animations-demo/sectionCssEffects";
import {
  ExplosionSection,
  FeedFireSection,
  StartScreenFxSection,
  TextMotionSection,
} from "@/pages/animations-demo/sectionComponents";
import { ShadersSection } from "@/pages/animations-demo/sectionShaders";

export type AnimationDemoSection = {
  id: string;
  label: string;
  Section: ComponentType;
};

/**
 * SSOT for `/dev/animations` nav + body.
 * Add a section component here (backed by real game components/configs) to surface it.
 */
export const ANIMATION_DEMO_SECTIONS: AnimationDemoSection[] = [
  { id: "estate-bars", label: "Estate bars", Section: EstateBarsSection },
  {
    id: "attack-waves-bar",
    label: "Attack waves",
    Section: AttackWavesBarSection,
  },
  { id: "improve-button", label: "Improve button", Section: ImproveButtonSection },
  { id: "cooldown-wash", label: "Cooldown wash", Section: CooldownWashSection },
  { id: "insight-badge", label: "Insight badge", Section: InsightBadgeSection },
  {
    id: "button-particles",
    label: "Click particles",
    Section: ButtonParticlesSection,
  },
  {
    id: "hover-particles",
    label: "Hover particles",
    Section: HoverParticlesSection,
  },
  { id: "progress-bars", label: "Progress bars", Section: ProgressBarsSection },
  {
    id: "shared-progress-shader",
    label: "Shared progress shader",
    Section: SharedProgressShaderSection,
  },
  { id: "text-motion", label: "Text motion", Section: TextMotionSection },
  {
    id: "start-screen-fx",
    label: "Start screen",
    Section: StartScreenFxSection,
  },
  { id: "feed-fire", label: "Feed fire", Section: FeedFireSection },
  { id: "explosion", label: "Explosion", Section: ExplosionSection },
  { id: "css-effects", label: "CSS effects", Section: CssEffectsSection },
  { id: "shaders", label: "Shaders", Section: ShadersSection },
];
