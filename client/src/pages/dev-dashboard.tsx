import { Link, Redirect } from "wouter";

const DEV_PAGES = [
  {
    href: "/dev/animations",
    title: "Animation playground",
    blurb: "Buttons, particles, bars, and shaders from the shared catalogs.",
  },
  {
    href: "/dev/starship-shader",
    title: "Starship shader",
    blurb: "Full-screen starship shader.",
  },
  {
    href: "/dev/combat-dialog",
    title: "Combat dialog",
    blurb: "Fight dialog with a late-game loadout.",
  },
  {
    href: "/dev/demo-end",
    title: "Demo end",
    blurb: "Steam and Galaxy demo end dialog.",
  },
  {
    href: "/dev/sounds",
    title: "Sounds",
    blurb: "Ambience and sound effects.",
  },
  {
    href: "/dev/production-icons",
    title: "Production icons",
    blurb: "Header rings, dialog rings, and achievement rings.",
  },
  {
    href: "/dev/village-map",
    title: "Village map",
    blurb: "Top-down village arrangement.",
  },
  {
    href: "/dev/building-shapes",
    title: "Building shapes",
    blurb: "Every building from above, at each stage drawn on the map.",
  },
] as const;

export default function DevDashboard() {
  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">Dev pages</h1>
          <p className="text-sm text-muted-foreground">
            Sandboxes for this development build.
          </p>
        </header>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DEV_PAGES.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="block h-full rounded-lg border border-neutral-800 bg-neutral-950/80 p-4 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
              >
                <div className="text-sm font-medium">{page.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {page.blurb}
                </p>
                <p className="mt-2 font-mono text-[11px] text-stone-500">{page.href}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
