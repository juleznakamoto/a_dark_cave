import { useId } from "react";
import { drawTree, type TreeVariant } from "@/pages/village-map-demo/trees";

/** One plan-view crown. Pass `filterId` when many trees share one wobble filter. */
export function TreeMark({
  variant,
  ink,
  fill,
  filterId,
}: {
  variant: TreeVariant;
  ink: string;
  fill: string;
  filterId?: string;
}) {
  const drawn = drawTree(variant);
  const ownId = useId().replace(/:/g, "");
  const clipId = `tree-clip-${ownId}`;
  const wobbleId = filterId ?? `tree-wobble-${ownId}`;
  return (
    <g filter={`url(#${wobbleId})`}>
      <defs>
        {filterId ? null : (
          <filter
            id={wobbleId}
            filterUnits="objectBoundingBox"
            primitiveUnits="userSpaceOnUse"
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={0.09}
              numOctaves={1}
              seed={variant.crowns[0]?.seed ?? 1}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.15} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
        <clipPath id={clipId}>
          <path d={drawn.outline} fillRule="evenodd" />
        </clipPath>
      </defs>
      <path
        d={drawn.outline}
        fill={fill}
        stroke={ink}
        strokeWidth={1.15}
        strokeLinejoin="round"
        strokeLinecap="round"
        fillRule="evenodd"
      />
      <g clipPath={`url(#${clipId})`}>
        <path d={drawn.foliage} fill="none" stroke={ink} strokeWidth={1.05} strokeLinecap="round" />
      </g>
    </g>
  );
}
