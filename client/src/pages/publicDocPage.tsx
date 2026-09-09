import { Helmet } from "react-helmet-async";
import { getPublicRouteSeo } from "@shared/publicSeo";
import { PUBLIC_PAGE_FOOTER_LINKS } from "@shared/publicPages";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { publicPageLinkClassName } from "@/pages/publicPageI18n";
import type { ReactNode } from "react";

export type PublicDocPath =
  | "/faq"
  | "/about"
  | "/imprint"
  | "/privacy"
  | "/terms"
  | "/withdrawal"
  | "/press"
  | "/unsubscribe";

type PublicDocPageProps = {
  path: PublicDocPath;
  heading: string;
  eyebrow?: string;
  description?: string;
  headerExtra?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
};

export function PublicPageFooter() {
  return (
    <nav className="border-t border-neutral-800 pt-6 text-neutral-400">
      {PUBLIC_PAGE_FOOTER_LINKS.map((link, index) => (
        <span key={link.id}>
          {index > 0 ? " · " : null}
          <a href={link.href} className={publicPageLinkClassName}>
            {link.label}
          </a>
        </span>
      ))}
    </nav>
  );
}

export default function PublicDocPage({
  path,
  heading,
  eyebrow,
  description,
  headerExtra,
  bodyClassName,
  children,
}: PublicDocPageProps) {
  const seo = getPublicRouteSeo(path)!;
  return (
    <ScrollArea className="h-screen w-full bg-black">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        {seo.robots ? <meta name="robots" content={seo.robots} /> : null}
        <link rel="canonical" href={`https://a-dark-cave.com${path}`} />
      </Helmet>
      <div className="px-4 py-12">
        <article className="legal-content mx-auto max-w-5xl space-y-10 text-sm leading-relaxed text-neutral-200">
          <header className="space-y-4">
            {eyebrow ? (
              <p className="m-0 text-xs uppercase tracking-wide text-neutral-500">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="m-0 text-3xl text-white sm:text-4xl">{heading}</h1>
            {description ? (
              <p className="m-0 text-sm text-neutral-400">{description}</p>
            ) : null}
            {headerExtra}
          </header>
          <div
            className={cn(
              bodyClassName ?? "space-y-6",
              "[&_h2]:m-0 [&_h2]:text-lg [&_h2]:text-white",
              "[&_h3]:m-0 [&_h3]:text-base [&_h3]:text-white",
              "[&_h4]:m-0 [&_h4]:text-sm [&_h4]:text-neutral-100",
              "[&_p]:m-0",
              "[&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5",
              "[&_ol]:m-0 [&_ol]:list-decimal [&_ol]:pl-5",
              "[&_a]:underline [&_a]:decoration-neutral-600 [&_a]:underline-offset-2 hover:[&_a]:decoration-neutral-300",
              "[&_section]:space-y-2",
            )}
          >
            {children}
          </div>
          <PublicPageFooter />
        </article>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
