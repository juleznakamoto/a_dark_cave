import { StarshipShader } from "@/components/ui/starship-shader";
import { Redirect } from "wouter";

export default function StarshipShaderDemo() {
  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div className="fixed inset-0 bg-black">
      <StarshipShader className="w-full h-full" />
    </div>
  );
}
