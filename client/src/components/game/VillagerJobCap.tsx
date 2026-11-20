import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type VillagerJobCapProps = {
  jobId: string;
  cap: number;
  atCap: boolean;
  className: string;
  /** Bump to replay the three-blink, for example + pressed while already full. */
  flashNonce?: number;
};

/**
 * /max beside a villager job. Flashes three times when the cap rises
 * (Insight upgrade applies after its reveal animation), and again when
 * flashNonce increases.
 */
export function VillagerJobCap({
  jobId,
  cap,
  atCap,
  className,
  flashNonce = 0,
}: VillagerJobCapProps) {
  const previousCapRef = useRef(cap);
  const previousNonceRef = useRef(flashNonce);
  const [flashGeneration, setFlashGeneration] = useState(0);

  useEffect(() => {
    const capRose = cap > previousCapRef.current;
    const nonceBumped = flashNonce > previousNonceRef.current;
    if (capRose || nonceBumped) {
      setFlashGeneration((generation) => generation + 1);
    }
    previousCapRef.current = cap;
    previousNonceRef.current = flashNonce;
  }, [cap, flashNonce]);

  return (
    <span
      translate="no"
      data-testid={`villager-job-cap-${jobId}`}
      className={cn(
        className,
        atCap ? "text-yellow-500" : "text-muted-foreground",
      )}
    >
      /<span
        key={flashGeneration}
        data-testid={`villager-job-cap-number-${jobId}`}
        className={cn(flashGeneration > 0 && "villager-cap-flash")}
      >
        {cap}
      </span>
    </span>
  );
}
