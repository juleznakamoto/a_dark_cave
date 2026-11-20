import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import { X } from "lucide-react";
import { toastVariants } from "@/components/ui/toast";
import { ToastStatusIcon, Toaster } from "@/components/ui/toaster";
import { toast, TOAST_ACTION_BUTTON_CLASS } from "@/hooks/use-toast";
import i18n, { applyDocumentLocale } from "@/i18n/index";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/locales";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  applyTextScaleToDocument,
  getStoredTextScale,
  TEXT_SCALE_OPTIONS,
  type TextScale,
} from "@/lib/textScale";
import { cn } from "@/lib/utils";
import {
  buildToastCatalog,
  type ToastSpecimen,
} from "@/pages/toasts-demo/catalog";

function ToastCard({ specimen }: { specimen: ToastSpecimen }) {
  return (
    <div
      data-specimen-toast={specimen.id}
      className={cn(
        toastVariants({ variant: specimen.variant }),
        "w-full max-w-[420px]",
        specimen.dismissible === false && "pr-6",
      )}
    >
      <div className="grid gap-1">
        <div className="text-sm font-semibold">
          <ToastStatusIcon
            success={specimen.success}
            error={specimen.variant === "destructive"}
          />
          {specimen.title}
        </div>
        {specimen.description ? (
          <div className="text-sm opacity-90">{specimen.description}</div>
        ) : null}
      </div>
      {specimen.actionLabel ? (
        <span className={TOAST_ACTION_BUTTON_CLASS}>{specimen.actionLabel}</span>
      ) : null}
      {specimen.dismissible !== false ? (
        <span
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/70 group-[.destructive]:text-destructive-foreground/70"
          aria-hidden
        >
          <X className="h-[18px] w-[18px]" />
        </span>
      ) : null}
    </div>
  );
}

function showSpecimen(specimen: ToastSpecimen) {
  toast({
    title: specimen.title,
    description: specimen.description,
    variant: specimen.variant,
    success: specimen.success,
    dismissible: specimen.dismissible,
    duration: specimen.dismissible ? undefined : Infinity,
    action: specimen.actionLabel
      ? { label: specimen.actionLabel, onClick: () => {} }
      : undefined,
  });
}

export default function ToastsDemo() {
  const { t } = useUiTranslation();
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<SupportedLocale>(
    () => (i18n.language as SupportedLocale) || "en",
  );
  const [scale, setScale] = useState<TextScale>(() => getStoredTextScale());

  useEffect(() => {
    const startingLocale = i18n.language;
    const startingScale = getStoredTextScale();
    let cancelled = false;
    void ensureGameplayLocalesLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      applyTextScaleToDocument(startingScale);
      void i18n.changeLanguage(startingLocale);
    };
  }, []);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const chooseLocale = (next: SupportedLocale) => {
    setLocale(next);
    void i18n.changeLanguage(next).then(() => {
      applyDocumentLocale(next);
    });
  };

  const chooseScale = (next: TextScale) => {
    setScale(next);
    applyTextScaleToDocument(next);
  };

  const groups = ready ? buildToastCatalog(t) : [];
  const count = groups.reduce((sum, group) => sum + group.specimens.length, 0);

  return (
    // Stop the pointer from reaching the deferred app toaster, or Show would
    // mount a second copy of the same toast.
    <div onPointerDown={(event) => event.stopPropagation()}>
    <div className="h-[100dvh] w-full overflow-y-auto bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="space-y-3">
          <p className="text-xs text-stone-500">
            <Link href="/dev" className="underline underline-offset-2">
              Dev pages
            </Link>
          </p>
          <h1 className="text-lg font-semibold">Toasts</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dev-only. Every toast the game can show, with the game&apos;s own
            copy. Show plays the live toast. The game keeps one regular toast
            at a time. Update toasts stay until you refresh. Language and text
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
          {ready ? (
            <p className="text-xs text-stone-500">{count} toasts</p>
          ) : null}
        </header>

        {ready ? (
          groups.map((group) => (
            <section key={group.title} className="space-y-4">
              <h2 className="text-sm font-medium text-stone-300">
                {group.title}
              </h2>
              <ul className="grid gap-6 md:grid-cols-2">
                {group.specimens.map((specimen) => (
                  <li key={specimen.id} className="space-y-2">
                    <div className="text-xs text-stone-500">{specimen.label}</div>
                    <ToastCard specimen={specimen} />
                    <button
                      type="button"
                      data-testid={`show-toast-${specimen.id}`}
                      onClick={() => showSpecimen(specimen)}
                      className="rounded border border-neutral-700 px-2 py-1 text-xs text-stone-300 hover:border-stone-400"
                    >
                      Show
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Loading copy...</p>
        )}
      </div>
    </div>
    <Toaster />
    </div>
  );
}
