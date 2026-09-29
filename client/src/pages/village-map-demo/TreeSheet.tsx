import type { ReactNode } from "react";
import { DEFAULT_TUNING, type Tuning } from "@/pages/village-map-demo/catalog";
import { markSize } from "@/pages/village-map-demo/geometry";
import { TreeMark } from "@/pages/village-map-demo/TreeMark";
import { BuildingMark, MapInkProvider } from "@/pages/village-map-demo/VillageMap";
import { TREE_VARIANTS } from "@/pages/village-map-demo/trees";

const FRAME = "-62 -48 124 96";

type SheetTuning = Pick<Tuning, "fill" | "ink" | "fire" | "interior" | "squareSize">;

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <svg viewBox={FRAME} className="h-auto w-full" role="img" aria-label={label}>
        {children}
      </svg>
      <figcaption className="text-center text-[11px] text-stone-800">{label}</figcaption>
    </figure>
  );
}

export default function TreeSheet({ tuning }: { tuning: SheetTuning }) {
  const hut = markSize("woodenHut", tuning.squareSize || DEFAULT_TUNING.squareSize);
  return (
    <div
      data-testid="tree-sheet"
      className="flex h-full flex-col overflow-auto"
      style={{ background: tuning.interior }}
    >
      <p className="px-4 pb-1 pt-12 text-xs leading-relaxed text-stone-700">
        Plan-view crowns: a scalloped outline of overlapping circles, and a few short curves inside. No trunks. Drawn at the same scale as the map. The last cell is a wooden hut.
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 p-4 sm:grid-cols-3 xl:grid-cols-4">
        {TREE_VARIANTS.map((variant) => (
          <Cell key={variant.id} label={variant.label}>
            <TreeMark variant={variant} ink={tuning.ink} fill={tuning.fill} />
          </Cell>
        ))}
        <Cell label="Wooden hut">
          <MapInkProvider ink={tuning.ink}>
            <BuildingMark
              buildingId="woodenHut"
              shape="hut"
              size={hut}
              tier={1}
              tuning={{ fill: tuning.fill, ink: tuning.ink, fire: tuning.fire }}
            />
          </MapInkProvider>
        </Cell>
      </div>
    </div>
  );
}
