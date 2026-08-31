import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getPublicRouteSeo } from "@shared/publicSeo";
import {
  PRESS_BOILERPLATE_LONG,
  PRESS_BOILERPLATE_SHORT,
  PRESS_CAPSULES,
  PRESS_CONTACT_EMAIL,
  PRESS_CONTACT_MAILTO,
  PRESS_FACTS,
  PRESS_HEADING,
  PRESS_LINKS,
  PRESS_LOCKED_LINE,
  PRESS_LOGOS,
  PRESS_PATH,
  PRESS_PERMISSIONS,
  PRESS_SCREENSHOTS,
  PRESS_TRAILER_EMBED_URL,
  PRESS_TRAILER_FILE_HREF,
  PRESS_TRAILER_YOUTUBE_URL,
  PRESS_VIDEOS,
  PRESS_ZIP_HREF,
  type PressAsset,
  type PressLink,
} from "@shared/pressKit";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Z_INDEX } from "@/lib/z-index";

const pressSeo = getPublicRouteSeo(PRESS_PATH)!;

const linkClassName =
  "underline decoration-neutral-600 underline-offset-2 hover:decoration-neutral-300";

function groupLinks(group: PressLink["group"]): PressLink[] {
  return PRESS_LINKS.filter((link) => link.group === group);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      data-testid={`button-copy-${label}`}
      className="shrink-0 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white"
      onClick={async () => {
        const ok = await copyText(text);
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CopyBlock({
  title,
  text,
  testId,
}: {
  title: string;
  text: string;
  testId: string;
}) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg text-white">{title}</h2>
        <CopyButton text={text} label={testId} />
      </div>
      <p className="m-0 whitespace-pre-wrap text-neutral-200">{text}</p>
    </section>
  );
}

function AssetLightbox({
  asset,
  onClose,
}: {
  asset: PressAsset;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={asset.label}
      className="fixed inset-0 flex items-center justify-center bg-black/90 p-4"
      style={{ zIndex: Z_INDEX.topLayer }}
      onClick={onClose}
    >
      {asset.kind === "video" ? (
        <video
          src={asset.href}
          controls
          autoPlay
          className="max-h-full max-w-full"
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <img
          src={asset.href}
          alt={asset.label}
          className="max-h-full max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onPreview,
}: {
  asset: PressAsset;
  onPreview: (asset: PressAsset) => void;
}) {
  const isVideo = asset.kind === "video";
  return (
    <figure className="m-0 overflow-hidden rounded border border-neutral-800 bg-neutral-950">
      <button
        type="button"
        className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
        onClick={() => onPreview(asset)}
        aria-label={`View ${asset.label}`}
      >
        {isVideo ? (
          <div className="flex aspect-video items-center justify-center bg-black text-sm text-neutral-400">
            Video file
          </div>
        ) : (
          <img
            src={asset.href}
            alt={asset.label}
            className="max-h-64 w-full object-contain"
          />
        )}
      </button>
      <figcaption className="space-y-1 p-3 text-xs text-neutral-300">
        <div className="font-medium text-neutral-100">{asset.label}</div>
        <div className="break-all text-neutral-500">{asset.fileName}</div>
        {asset.sizeHint ? (
          <div className="text-neutral-500">{asset.sizeHint}</div>
        ) : null}
        <a href={asset.href} download={asset.fileName} className={linkClassName}>
          Download
        </a>
      </figcaption>
    </figure>
  );
}

function AssetGrid({
  title,
  assets,
  onPreview,
}: {
  title: string;
  assets: readonly PressAsset[];
  onPreview: (asset: PressAsset) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="m-0 text-lg text-white">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onPreview={onPreview} />
        ))}
      </div>
    </section>
  );
}

function LinkList({
  title,
  links,
}: {
  title: string;
  links: PressLink[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="m-0 text-lg text-white">{title}</h2>
      <ul className="m-0 list-none space-y-1 p-0">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              className={linkClassName}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Press() {
  const [preview, setPreview] = useState<PressAsset | null>(null);

  return (
    <>
      <ScrollArea className="h-screen w-full bg-black">
        <Helmet>
          <title>{pressSeo.title}</title>
          <meta name="description" content={pressSeo.description} />
          <link rel="canonical" href={`https://a-dark-cave.com${PRESS_PATH}`} />
        </Helmet>
        <div className="px-4 py-12">
          <article className="legal-content mx-auto max-w-5xl space-y-10 text-sm leading-relaxed text-neutral-200">
            <header className="space-y-4">
              <p className="m-0 text-xs uppercase tracking-wide text-neutral-500">
                Press kit
              </p>
              <h1 className="m-0 text-3xl text-white sm:text-4xl">{PRESS_HEADING}</h1>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="m-0 text-base text-white">{PRESS_LOCKED_LINE}</p>
                <CopyButton text={PRESS_LOCKED_LINE} label="locked-line" />
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={PRESS_ZIP_HREF}
                  download="a_dark_cave_press_kit.zip"
                  className="rounded border border-neutral-500 bg-neutral-100 px-3 py-2 text-sm text-black hover:bg-white"
                  data-testid="button-download-press-zip"
                >
                  Download all assets (ZIP)
                </a>
                <a
                  href={PRESS_CONTACT_MAILTO}
                  className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500"
                >
                  Email {PRESS_CONTACT_EMAIL}
                </a>
              </div>
            </header>

            <CopyBlock
              title="Short boilerplate (~50 words)"
              text={PRESS_BOILERPLATE_SHORT}
              testId="boilerplate-short"
            />
            <CopyBlock
              title="Long boilerplate (~150 words)"
              text={PRESS_BOILERPLATE_LONG}
              testId="boilerplate-long"
            />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-lg text-white">Fact sheet</h2>
                <CopyButton
                  text={PRESS_FACTS.map((fact) => `${fact.label}: ${fact.value}`).join(
                    "\n",
                  )}
                  label="fact-sheet"
                />
              </div>
              <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
                {PRESS_FACTS.map((fact) => (
                  <div key={fact.label} className="contents">
                    <dt className="m-0 text-neutral-500">{fact.label}</dt>
                    <dd className="m-0">
                      {fact.href ? (
                        <a
                          href={fact.href}
                          className={linkClassName}
                          {...(fact.href.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {fact.value}
                        </a>
                      ) : (
                        fact.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="space-y-3">
              <h2 className="m-0 text-lg text-white">Gameplay trailer</h2>
              <div className="aspect-video overflow-hidden rounded border border-neutral-800 bg-black">
                <iframe
                  title="A Dark Cave gameplay trailer"
                  src={PRESS_TRAILER_EMBED_URL}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="m-0">
                <a
                  href={PRESS_TRAILER_YOUTUBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                >
                  YouTube
                </a>
                {" · "}
                <a
                  href={PRESS_TRAILER_FILE_HREF}
                  download={PRESS_VIDEOS[0]?.fileName}
                  className={linkClassName}
                >
                  Download MP4
                </a>
              </p>
            </section>

            <AssetGrid
              title="Logos"
              assets={PRESS_LOGOS}
              onPreview={setPreview}
            />
            <AssetGrid
              title="Steam capsules"
              assets={PRESS_CAPSULES}
              onPreview={setPreview}
            />
            <AssetGrid
              title="Screenshots"
              assets={PRESS_SCREENSHOTS}
              onPreview={setPreview}
            />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
              <LinkList title="Play and store" links={groupLinks("play")} />
              <LinkList title="Social" links={groupLinks("social")} />
              <LinkList title="Directories" links={groupLinks("directory")} />
            </div>

            <section className="space-y-2">
              <h2 className="m-0 text-lg text-white">Permissions</h2>
              <p className="m-0">{PRESS_PERMISSIONS}</p>
            </section>

            <section className="space-y-2">
              <h2 className="m-0 text-lg text-white">Contact</h2>
              <p className="m-0">
                Julian Bauer, solo developer.{" "}
                <a href={PRESS_CONTACT_MAILTO} className={linkClassName}>
                  {PRESS_CONTACT_EMAIL}
                </a>
              </p>
            </section>

            <nav className="border-t border-neutral-800 pt-6 text-neutral-400">
              <a href="/" className={linkClassName}>
                Play
              </a>
              {" · "}
              <a href="/about" className={linkClassName}>
                About
              </a>
              {" · "}
              <a href="/faq" className={linkClassName}>
                FAQ
              </a>
            </nav>
          </article>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      {preview ? (
        <AssetLightbox asset={preview} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
