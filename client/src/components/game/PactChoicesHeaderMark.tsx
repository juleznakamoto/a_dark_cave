import { PACT_CHOICE_MAX } from "@/game/rules/pacts";

/** Five red rings. Unlocked pact choices fill from the left. */
export function PactChoicesHeaderMark({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  const filled = Math.min(
    PACT_CHOICE_MAX,
    Math.max(0, Math.floor(count)),
  );

  return (
    <span
      className="game-header-pact-choices flex shrink-0 cursor-default items-center opacity-60 transition-opacity hover:opacity-100"
      aria-label={label}
      data-testid="pact-choices-indicator"
      data-pact-choices={filled}
    >
      {Array.from({ length: PACT_CHOICE_MAX }, (_, index) => {
        const unlocked = index < filled;
        return (
          <span
            key={index}
            className="game-header-pact-choice inline-flex items-center justify-center rounded-full border border-red-600"
            data-filled={unlocked ? "true" : "false"}
            aria-hidden
          >
            {unlocked ? (
              <span
                className="game-header-pact-choice-fill rounded-full"
                // 0.6s is one fifth of the 3s spin, so each circle starts a step behind.
                style={{ animationDelay: `${index * -0.6}s` }}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
