import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SmokeShader } from "@/components/ui/smoke-shader";
import { SmokeBackground } from "@/components/ui/spooky-smoke-animation";
import MistBackground from "@/components/ui/mist-background";
import CloudShader from "@/components/ui/cloud-shader";
import { DemoSection } from "@/pages/animations-demo/DemoSection";

function ShaderPreview({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative h-36 w-full overflow-hidden rounded-md border border-border/50 bg-black">
        {children}
      </div>
    </div>
  );
}

export function ShadersSection() {
  const [showMist, setShowMist] = useState(false);
  const [showSpooky, setShowSpooky] = useState(false);
  const [showSmoke, setShowSmoke] = useState(true);
  const [showCloud, setShowCloud] = useState(false);

  return (
    <DemoSection
      id="shaders"
      title="Shaders & overlays"
      description="Real shader components. Full-screen starship demo: /dev/starship-shader. Combat sandbox: /dev/combat-dialog."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          size="xs"
          variant={showSmoke ? "default" : "outline"}
          onClick={() => setShowSmoke((v) => !v)}
        >
          Shop smoke
        </Button>
        <Button
          size="xs"
          variant={showSpooky ? "default" : "outline"}
          onClick={() => setShowSpooky((v) => !v)}
        >
          Blood moon
        </Button>
        <Button
          size="xs"
          variant={showMist ? "default" : "outline"}
          onClick={() => setShowMist((v) => !v)}
        >
          Sleep mist
        </Button>
        <Button
          size="xs"
          variant={showCloud ? "default" : "outline"}
          onClick={() => setShowCloud((v) => !v)}
        >
          Start clouds
        </Button>
        <Button size="xs" variant="outline" asChild>
          <a href="/dev/starship-shader">Starship shader</a>
        </Button>
        <Button size="xs" variant="outline" asChild>
          <a href="/dev/combat-dialog">Combat dialog</a>
        </Button>
        <Button size="xs" variant="outline" asChild>
          <a href="/dev/sounds">Sounds</a>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {showSmoke ? (
          <ShaderPreview label="SmokeShader (shop Insight banner)">
            <SmokeShader className="absolute inset-0 h-full w-full" />
          </ShaderPreview>
        ) : null}
        {showSpooky ? (
          <ShaderPreview label="SmokeBackground (blood moon)">
            <SmokeBackground
              smokeColor="#8B0000"
              className="absolute inset-0 h-full w-full"
            />
          </ShaderPreview>
        ) : null}
        {showMist ? (
          <ShaderPreview label="MistBackground (sleep)">
            <MistBackground />
          </ShaderPreview>
        ) : null}
        {showCloud ? (
          <ShaderPreview label="CloudShader (start screen)">
            <CloudShader />
          </ShaderPreview>
        ) : null}
      </div>
    </DemoSection>
  );
}
