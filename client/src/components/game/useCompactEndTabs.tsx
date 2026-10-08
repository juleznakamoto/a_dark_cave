import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { TEXT_SCALE_CHANGE_EVENT } from "@/lib/textScale";
import { GameUiIcon, MapTabIcon } from "@/components/game/GameUiIcon";
import {
  GAME_PANEL_HEADER_BAND,
  TAB_ICON_ALIGN_CLASS,
  TAB_ICON_SIZE_CLASS,
} from "@/components/game/gameChrome";
import {
  chooseEndTabIcons,
  type EndTabIconChoice,
  type MeasuredTabSlot,
} from "@/components/game/tabLabelFit";

const LABELS: EndTabIconChoice = {
  mapIcon: false,
  achievementsIcon: false,
};

/** Same type metrics as location-tab buttons, forced to one unwrapped line. */
const MEASURE_CLASS = `${GAME_PANEL_HEADER_BAND} w-max whitespace-nowrap font-medium tracking-wide`;

function readSlot(
  host: HTMLElement,
  id: "map" | "achievements",
): MeasuredTabSlot | null {
  const label = host.querySelector<HTMLElement>(
    `[data-tab-measure="${id}-label"]`,
  );
  const icon = host.querySelector<HTMLElement>(
    `[data-tab-measure="${id}-icon"]`,
  );
  if (!label || !icon) return null;
  const labelWidth = label.offsetWidth;
  const iconWidth = icon.offsetWidth;
  if (labelWidth <= 0 || iconWidth <= 0) return null;
  return { labelWidth, iconWidth };
}

function liveWidth(row: HTMLElement, testId: string): number {
  return (
    row.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.offsetWidth ??
    0
  );
}

/**
 * Sum of the tab buttons. `scrollWidth` is at least `clientWidth`, so leftover
 * room would otherwise look like content and the words would never come back.
 */
function rowContentWidth(row: HTMLElement): number {
  const children = [...row.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  const gapRaw = getComputedStyle(row).columnGap;
  const gap = gapRaw.endsWith("px") ? parseFloat(gapRaw) : 0;
  const widths = children.reduce((sum, el) => sum + el.offsetWidth, 0);
  return widths + gap * Math.max(0, children.length - 1);
}

/**
 * Words for Map and Achievements, icons when the tab row cannot hold them.
 * Measurements live in a fixed, hidden host so they do not change the row.
 */
export function useCompactEndTabs(options: {
  rowRef: RefObject<HTMLElement | null>;
  mapLabel: string;
  achievementsLabel: string;
  mapVisible: boolean;
  achievementsVisible: boolean;
  active: boolean;
}): { icons: EndTabIconChoice; measure: ReactNode } {
  const {
    rowRef,
    mapLabel,
    achievementsLabel,
    mapVisible,
    achievementsVisible,
    active,
  } = options;
  const [icons, setIcons] = useState<EndTabIconChoice>(LABELS);
  const measureHostRef = useRef<HTMLDivElement | null>(null);
  const updateRef = useRef(() => {});

  updateRef.current = () => {
    if (!active) {
      setIcons((prev) =>
        prev.mapIcon || prev.achievementsIcon ? LABELS : prev,
      );
      return;
    }
    const row = rowRef.current;
    const host = measureHostRef.current;
    if (!row || !host || row.clientWidth <= 0) return;

    const mapLive = mapVisible ? liveWidth(row, "tab-map") : 0;
    const achievementsLive = achievementsVisible
      ? liveWidth(row, "tab-achievements")
      : 0;
    if (mapVisible && mapLive <= 0) return;
    if (achievementsVisible && achievementsLive <= 0) return;

    const map = mapVisible ? readSlot(host, "map") : null;
    const achievements = achievementsVisible
      ? readSlot(host, "achievements")
      : null;
    if (mapVisible && !map) return;
    if (achievementsVisible && !achievements) return;

    const next = chooseEndTabIcons({
      clientWidth: row.clientWidth,
      otherWidth: Math.max(0, rowContentWidth(row) - mapLive - achievementsLive),
      map,
      achievements,
    });
    setIcons((prev) =>
      prev.mapIcon === next.mapIcon &&
      prev.achievementsIcon === next.achievementsIcon
        ? prev
        : next,
    );
  };

  useLayoutEffect(() => {
    updateRef.current();
  }, [
    active,
    mapLabel,
    achievementsLabel,
    mapVisible,
    achievementsVisible,
    icons.mapIcon,
    icons.achievementsIcon,
  ]);

  useEffect(() => {
    if (!active || typeof ResizeObserver === "undefined") return;
    const row = rowRef.current;
    const host = measureHostRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => updateRef.current());
    observer.observe(row);
    if (host) observer.observe(host);
    const onTextScale = () => updateRef.current();
    window.addEventListener(TEXT_SCALE_CHANGE_EVENT, onTextScale);
    updateRef.current();
    return () => {
      observer.disconnect();
      window.removeEventListener(TEXT_SCALE_CHANGE_EVENT, onTextScale);
    };
  }, [
    active,
    rowRef,
    mapLabel,
    achievementsLabel,
    mapVisible,
    achievementsVisible,
  ]);

  const measure = active ? (
    <div
      ref={measureHostRef}
      aria-hidden
      className="pointer-events-none invisible fixed left-0 top-0 -z-10 flex flex-col items-start"
    >
      {mapVisible ? (
        <>
          <span data-tab-measure="map-label" className={MEASURE_CLASS}>
            {mapLabel}
          </span>
          <span data-tab-measure="map-icon" className={MEASURE_CLASS}>
            <MapTabIcon />
          </span>
        </>
      ) : null}
      {achievementsVisible ? (
        <>
          <span
            data-tab-measure="achievements-label"
            className={MEASURE_CLASS}
          >
            {achievementsLabel}
          </span>
          <span data-tab-measure="achievements-icon" className={MEASURE_CLASS}>
            <GameUiIcon
              name="achievements"
              sizeClassName={TAB_ICON_SIZE_CLASS}
              className={TAB_ICON_ALIGN_CLASS}
            />
          </span>
        </>
      ) : null}
    </div>
  ) : null;

  return { icons, measure };
}
