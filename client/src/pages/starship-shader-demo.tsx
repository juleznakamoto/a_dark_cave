import { useState } from "react";
import { StarshipShader } from "@/components/ui/starship-shader";
import { Redirect } from "wouter";

export default function StarshipShaderDemo() {
  const [error, setError] = useState<string | null>(null);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-black">
      <StarshipShader className="h-full w-full" onFatalError={setError} />
      {error ? (
        <p className="pointer-events-none absolute bottom-4 left-4 right-4 text-sm text-red-400">
          WebGL failed: {error}
        </p>
      ) : null}
    </div>
  );
}
