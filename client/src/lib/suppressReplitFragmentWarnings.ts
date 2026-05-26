/**
 * Replit dev injects `data-replit-metadata` onto React elements. Fragments reject
 * unknown props and React logs a warning per fragment — flooding the console.
 */
function isReplitFragmentConsoleNoise(args: unknown[]): boolean {
  const text = args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.message;
      return "";
    })
    .join(" ");
  return (
    text.includes("data-replit-metadata") && text.includes("React.Fragment")
  );
}

function patchConsoleMethod(method: "error" | "warn"): void {
  const original = console[method].bind(console);
  console[method] = (...args: unknown[]) => {
    if (isReplitFragmentConsoleNoise(args)) return;
    original(...args);
  };
}

export function installSuppressReplitFragmentWarnings(): void {
  if (!import.meta.env.DEV) return;
  patchConsoleMethod("error");
  patchConsoleMethod("warn");
}
