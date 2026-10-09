import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type VillagerJobCapProps = {
  jobId: string;
  cap: number;
  atCap: boolean;
  className: string;
};

/**
 * /max beside a villager job. Flashes three times when the cap rises
 * (Insight upgrade applies after its reveal animation).
 */
export function VillagerJobCap({
  jobId,
  cap,
  atCap,
  className,
}: VillagerJobCapProps) {
  const previousCapRef = useRef(cap);
  const [flashGeneration, setFlashGeneration] = useState(0);

  useEffect(() => {
    if (cap > previousCapRef.current) {
      setFlashGeneration((generation) => generation + 1);
    }
    previousCapRef.current = cap;
  }, [cap]);

  return (
    <span
      translate="no"
      data-testid={`villager-job-cap-${jobId}`}
      className={cn(className, !atCap && "text-muted-foreground")}
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
