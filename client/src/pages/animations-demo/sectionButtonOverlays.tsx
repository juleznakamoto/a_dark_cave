import { ButtonOverlaysCatalog } from "@/pages/button-overlays-catalog";
import { DemoSection } from "@/pages/animations-demo/DemoSection";

export function ButtonOverlaysSection() {
  return (
    <DemoSection
      id="button-overlays"
      title="Button overlays"
      description="1:1 copies of badges and mini-buttons we pin onto other buttons. Same hosts as /dev/production-icons."
    >
      <ButtonOverlaysCatalog />
    </DemoSection>
  );
}
