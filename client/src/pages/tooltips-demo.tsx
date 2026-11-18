import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { buildDevSave } from "@/game/devSaves";
import { useGameStore } from "@/game/state";
import type { GameState } from "@shared/schema";
import { TooltipDemoGallery } from "@/pages/tooltips-demo/gallery";
import i18n, { applyDocumentLocale } from "@/i18n/index";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/locales";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import {
  applyTextScaleToDocument,
  getStoredTextScale,
  TEXT_SCALE_OPTIONS,
  type TextScale,
} from "@/lib/textScale";
import { cn } from "@/lib/utils";

type OverflowHit = { id: string; text: string };

function textOutsideBox(box: Element): string[] {
  const boxRect = box.getBoundingClientRect();
  const hits: string[] = [];
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (text) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        const outside =
          rect.right > boxRect.right + 1 ||
          rect.left < boxRect.left - 1 ||
          rect.bottom > boxRect.bottom + 1 ||
          rect.top < boxRect.top - 1;
        if (outside) {
          hits.push(text.slice(0, 120));
          break;
        }
      }
    }
    node = walker.nextNode();
  }
  return hits;
}

function measureTooltipOverflow(): OverflowHit[] {
  const hits: OverflowHit[] = [];
  document.querySelectorAll("[data-specimen-tip]").forEach((tip) => {
    const id = tip.getAttribute("data-specimen-tip") ?? "tip";
    for (const text of textOutsideBox(tip)) {
      hits.push({ id, text });
    }
  });
  document.querySelectorAll("[data-hover-callout]").forEach((callout, index) => {
    const id = `callout-${index}`;
    for (const text of textOutsideBox(callout)) {
      hits.push({ id, text });
    }
  });
  return hits;
}

function OverflowReport({ revision }: { revision: number }) {
  const [hits, setHits] = useState<OverflowHit[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) setHits(measureTooltipOverflow());
    };
    const timer = window.setTimeout(run, 50);
    window.addEventListener("resize", run);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
    };
  }, [revision]);

  return (
    <pre
      data-testid="tooltip-overflow-report"
      className="whitespace-pre-wrap rounded border border-neutral-800 bg-neutral-950 p-3 text-xs text-stone-300"
    >
      {hits == null
        ? "Measuring..."
        : hits.length === 0
          ? "No text outside a tooltip box."
          : hits.map((hit) => `${hit.id}: ${hit.text}`).join("\n")}
    </pre>
  );
}

function CalloutSamples() {
  const { t } = useUiTranslation();
  const labels = [
    t("footer.pactChoicesUnlocked", { defaultValue: "Pact choices unlocked" }),
    t("footer.cruelModeActive"),
    t("footer.wishlistOnSteam"),
    t("playlight.tryMoreGames", { defaultValue: "Try more Games" }),
    t("languageSelector.ariaLabel"),
  ];
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-10 pt-8">
      {labels.map((label) => (
        <HoverCalloutTooltip key={label} label={label} forceVisible side="top">
          <span className="inline-flex rounded border border-neutral-700 px-2 py-1 text-xs text-stone-300">
            {label}
          </span>
        </HoverCalloutTooltip>
      ))}
    </div>
  );
}

export default function TooltipsDemo() {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<SupportedLocale>(
    () => (i18n.language as SupportedLocale) || "en",
  );
  const [scale, setScale] = useState<TextScale>(() => getStoredTextScale());
  const [revision, setRevision] = useState(0);
  const state = useGameStore((s) => s) as unknown as GameState;

  useEffect(() => {
    const previous = useGameStore.getState();
    const startingLocale = i18n.language;
    const save = buildDevSave("bastion");
    useGameStore.setState({
      ...save,
      activeDevSaveId: "bastion",
      books: { ...save.books, book_of_ascension: true },
      story: {
        ...save.story,
        seen: { ...save.story.seen, veinrootDiscovered: true },
      },
      executionDurations: {
        ...(save.executionDurations ?? {}),
        buildWatchtower: 180,
      },
      ...(save.heartfireState
        ? {
            heartfireState: {
              ...save.heartfireState,
              level: Math.max(save.heartfireState.level, 2),
            },
          }
        : {}),
    });
    mountNotoSansSymbols2FontFace();
    let cancelled = false;
    void ensureGameplayLocalesLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      useGameStore.setState(previous);
      applyTextScaleToDocument(getStoredTextScale());
      void i18n.changeLanguage(startingLocale);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setRevision((value) => value + 1);
  }, [ready, locale, scale]);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const chooseLocale = (next: SupportedLocale) => {
    setLocale(next);
    void i18n.changeLanguage(next).then(() => {
      applyDocumentLocale(next);
      setRevision((value) => value + 1);
    });
  };

  const chooseScale = (next: TextScale) => {
    setScale(next);
    applyTextScaleToDocument(next);
  };

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-3">
          <h1 className="text-lg font-semibold">Tooltips</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dev-only. Each box is the real tooltip frame, filled with the
            game&apos;s own copy from a Bastion fixture. Language and text
            size here are not saved.
          </p>
          <div className="flex flex-wrap gap-1">
            {SUPPORTED_LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => chooseLocale(code)}
                className={cn(
                  "rounded border px-2 py-1 text-xs",
                  locale === code
                    ? "border-stone-300 text-stone-100"
                    : "border-neutral-800 text-stone-500",
                )}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {TEXT_SCALE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseScale(option)}
                className={cn(
                  "rounded border px-2 py-1 text-xs",
                  scale === option
                    ? "border-stone-300 text-stone-100"
                    : "border-neutral-800 text-stone-500",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </header>

        <OverflowReport revision={revision} />

        {ready ? (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-stone-300">
                Hover callouts
              </h2>
              <CalloutSamples />
            </section>
            <TooltipDemoGallery key={locale} state={state} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading copy...</p>
        )}
      </div>
    </div>
  );
}
