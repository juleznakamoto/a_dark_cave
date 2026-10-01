import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Z_INDEX } from "@/lib/z-index";

const DESKTOP_MIN_PX = 768;

type HotkeyBadge = {
  key: string;
  /** Tab-center X, relative to the first tab's center. */
  offset: number;
  label: string;
};

type CalloutLayout = {
  top: number;
  centerX: number;
  stripWidth: number;
  badges: HotkeyBadge[];
};

function isDesktopViewport(): boolean {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`).matches;
  }
  return window.innerWidth >= DESKTOP_MIN_PX;
}

function findTabButton(row: HTMLElement, tab: string): HTMLElement | null {
  const unlocked = `[data-testid="tab-${tab}"]`;
  const locked = `[data-testid="tab-${tab}-locked"]`;
  return (
    row.querySelector<HTMLElement>(unlocked) ??
    row.querySelector<HTMLElement>(locked) ??
    document.querySelector<HTMLElement>(unlocked) ??
    document.querySelector<HTMLElement>(locked)
  );
}

/** Place the callout under the tab row. Does not measure the callout itself. */
export function measureTabHotkeyCallout(
  row: HTMLElement,
  tabs: readonly string[],
): CalloutLayout | null {
  if (!isDesktopViewport()) return null;
  const nav = row.closest("nav");
  const anchor = nav ?? row;
  const badges: HotkeyBadge[] = [];
  tabs.forEach((tab, index) => {
    const el = findTabButton(row, tab);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    badges.push({
      key: tab,
      offset: rect.left + rect.width / 2,
      label: `[${index + 1}]`,
    });
  });
  if (badges.length === 0) return null;
  const first = badges[0]!.offset;
  const last = badges[badges.length - 1]!.offset;
  return {
    top: anchor.getBoundingClientRect().bottom + 2,
    centerX: (first + last) / 2,
    stripWidth: Math.max(0, last - first),
    badges: badges.map((badge) => ({ ...badge, offset: badge.offset - first })),
  };
}

function sameLayout(a: CalloutLayout, b: CalloutLayout): boolean {
  if (a.top !== b.top || a.centerX !== b.centerX || a.stripWidth !== b.stripWidth) {
    return false;
  }
  if (a.badges.length !== b.badges.length) return false;
  return a.badges.every((badge, index) => {
    const other = b.badges[index];
    return (
      other != null &&
      badge.key === other.key &&
      badge.offset === other.offset &&
      badge.label === other.label
    );
  });
}

type TabHotkeyCalloutProps = {
  tabRowRef: RefObject<HTMLElement | null>;
  tabs: readonly string[];
  testId: string;
  dismissTestId: string;
  dismissLabel: string;
  onDismiss: () => void;
  children: ReactNode;
};

/**
 * One bordered callout under the tabs: key numbers, then the hint sentence.
 * The border is on this element, so it cannot show up without the text.
 */
export default function TabHotkeyCallout({
  tabRowRef,
  tabs,
  testId,
  dismissTestId,
  dismissLabel,
  onDismiss,
  children,
}: TabHotkeyCalloutProps) {
  const [layout, setLayout] = useState<CalloutLayout | null>(null);

  const measure = useCallback(() => {
    const row = tabRowRef.current;
    const next = row ? measureTabHotkeyCallout(row, tabs) : null;
    setLayout((prev) => {
      if (prev == null || next == null) return next;
      return sameLayout(prev, next) ? prev : next;
    });
  }, [tabRowRef, tabs]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const row = tabRowRef.current;
    if (!row || typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", onResize);
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [measure, tabRowRef]);

  if (layout == null || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 hidden md:block"
      style={{ zIndex: Z_INDEX.tabHotkeyOverlay }}
    >
      <div
        className="pointer-events-auto absolute w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded border border-red-500 bg-neutral-950 px-5 pb-2 pt-1.5"
        style={{ top: layout.top, left: layout.centerX }}
        data-testid={testId}
      >
        <button
          type="button"
          className="button-hotkey-dismiss flex cursor-pointer items-center justify-center rounded-full border border-red-800/50 bg-red-950 text-white shadow-sm transition-colors hover:bg-red-900"
          aria-label={dismissLabel}
          data-testid={dismissTestId}
          onClick={onDismiss}
        >
          <X className="h-4 w-4 stroke-[3]" />
        </button>
        <div
          className="relative mx-auto h-3.5"
          style={{ width: layout.stripWidth }}
        >
          {layout.badges.map((badge) => (
            <span
              key={badge.key}
              className="absolute top-0 -translate-x-1/2 text-xs font-semibold leading-none text-foreground"
              style={{ left: badge.offset }}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <div
          data-testid="tab-hotkey-hint"
          className="mt-0.5 whitespace-nowrap text-center text-xs leading-none text-foreground"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
