import { StarshipShader } from "@/components/ui/starship-shader";
import { Redirect } from "wouter";

export default function StarshipShaderDemo() {
  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div className="fixed inset-0 relative bg-black">
      <StarshipShader />
    </div>
  );
}
