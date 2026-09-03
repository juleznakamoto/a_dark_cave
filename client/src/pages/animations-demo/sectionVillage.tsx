import {
  ConstructionQueueSlot,
  type ConstructionQueueSlotKind,
} from "@/components/game/ConstructionQueueSlot";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

const SLOT_KINDS: { kind: ConstructionQueueSlotKind; label: string }[] = [
  { kind: "free", label: "Free" },
  { kind: "used", label: "Used" },
  { kind: "plus", label: "Insight unlock" },
  { kind: "locked", label: "Building locked" },
];

export function QueueSlotsSection() {
  return (
    <DemoSection
      id="queue-slots"
      title="Build queue slots"
      description="Village Build header marks. The used square uses the share-card spinning rim in red, with no hover."
    >
      <DemoRow label="Header row">
        <div className="flex items-center gap-1">
          <ConstructionQueueSlot kind="used" testId="demo-queue-slot-used" />
          <ConstructionQueueSlot kind="free" testId="demo-queue-slot-free" />
          <ConstructionQueueSlot kind="plus" testId="demo-queue-slot-plus" />
          <ConstructionQueueSlot kind="locked" testId="demo-queue-slot-locked" />
        </div>
      </DemoRow>
      {SLOT_KINDS.map(({ kind, label }) => (
        <DemoRow key={kind} label={label}>
          <ConstructionQueueSlot kind={kind} testId={`demo-queue-slot-${kind}-solo`} />
        </DemoRow>
      ))}
    </DemoSection>
  );
}
