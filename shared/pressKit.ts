/** Press kit copy, fact sheet, and asset manifest. English is the quote language. */

const SITE = "https://a-dark-cave.com";
const STEAM_URL = "https://store.steampowered.com/app/4882240/A_Dark_Cave/";
const STEAM_DEMO_URL = "https://store.steampowered.com/app/4971800/";
const ITCH_URL = "https://a-dark-cave.itch.io/a-dark-cave";
const REDDIT_URL = "https://www.reddit.com/r/aDarkCave/";
const PUBLIC_STEAM_UTM =
  "utm_source=a_dark_cave&utm_medium=web_game&utm_campaign=steam_store&utm_content=html_noscript_footer";
const PUBLIC_STEAM_URL = `${STEAM_URL}?${PUBLIC_STEAM_UTM}`;
const PUBLIC_STEAM_DEMO_URL = `${STEAM_DEMO_URL}?${PUBLIC_STEAM_UTM}`;

export const PRESS_PATH = "/press" as const;
export const PRESS_ASSET_DIR = "/press-kit" as const;
export const PRESS_ZIP_HREF = `${PRESS_ASSET_DIR}/a_dark_cave_press_kit.zip`;

export const PRESS_HEADING = "A Dark Cave Press Kit";

export const PRESS_LOCKED_LINE =
  "Dark story-driven minimalist incremental village builder";

/** ~50 words. Quote-ready. No MTX. Do not call Steam free. */
export const PRESS_BOILERPLATE_SHORT =
  "A Dark Cave is a text-based incremental. You wake in a cave, light a fire, gather resources, and build a village as the story unfolds. Play for free in your browser. A paid Steam edition for Windows is planned for 27 October 2026. A free demo is available now.";

/** ~150 words. Quote-ready. No MTX. Do not call Steam free. */
export const PRESS_BOILERPLATE_LONG =
  "A Dark Cave is a text-based incremental survival and settlement game. You wake at the mouth of a cave with no memory. A small fire is all that stands between you and the dark. You gather wood, craft tools, recruit villagers, and grow a settlement while a story about a lost civilization unfolds below. The game is semi-idle and active: you make choices, manage jobs, explore, and fight, rather than clicking a second-screen idle. Graphics stay minimal so the writing, systems, and atmosphere do the work. If you liked A Dark Room or Kittens Game, this is aimed at that taste. Play for free in your browser on desktop or mobile. A paid Windows edition is coming to Steam on 27 October 2026. A free Steam demo is available now. A Dark Cave will appear at Steam Next Fest from 19 to 26 October 2026. Julian Bauer is the solo developer. Press contact: support@a-dark-cave.com.";

export const PRESS_COMPS_LINE = "A Dark Room, Kittens Game, Universal Paperclips";

export const PRESS_TRAILER_YOUTUBE_ID = "G8Gm7o4cZfQ";
export const PRESS_TRAILER_YOUTUBE_URL =
  `https://www.youtube.com/watch?v=${PRESS_TRAILER_YOUTUBE_ID}` as const;
export const PRESS_TRAILER_EMBED_URL =
  `https://www.youtube.com/embed/${PRESS_TRAILER_YOUTUBE_ID}` as const;
export const PRESS_TRAILER_FILE_HREF =
  `${PRESS_ASSET_DIR}/video/a_dark_cave_gameplay_trailer.mp4` as const;

export const PRESS_CONTACT_EMAIL = "support@a-dark-cave.com";
export const PRESS_CONTACT_MAILTO = `mailto:${PRESS_CONTACT_EMAIL}`;

export const PRESS_PERMISSIONS =
  "You may stream, record, and monetize video of A Dark Cave. No extra permission is needed.";

export type PressFact = {
  label: string;
  value: string;
  href?: string;
};

export const PRESS_FACTS: readonly PressFact[] = [
  { label: "Title", value: "A Dark Cave" },
  { label: "Genre", value: "Incremental, text-based survival, settlement builder" },
  { label: "Player count", value: "Single-player" },
  {
    label: "Platforms",
    value: "Web browser (desktop and mobile), Windows (Steam)",
  },
  { label: "Web listing", value: "17 November 2025" },
  { label: "Steam release", value: "27 October 2026 (planned)" },
  { label: "Steam Next Fest", value: "19-26 October 2026" },
  { label: "Developer / publisher", value: "Julian Bauer" },
  {
    label: "Website",
    value: "https://a-dark-cave.com",
    href: SITE,
  },
  {
    label: "Steam",
    value: "App 4882240 (paid Windows edition)",
    href: PUBLIC_STEAM_URL,
  },
  {
    label: "Steam demo",
    value: "App 4971800, available now",
    href: PUBLIC_STEAM_DEMO_URL,
  },
  { label: "Browser", value: "Play for free at a-dark-cave.com", href: SITE },
  { label: "Price", value: "Browser: play for free. Steam: paid (price TBA)." },
  {
    label: "Languages",
    value:
      "English, German, French, Spanish, Italian, Portuguese (Brazil), Simplified Chinese, Russian. Steam also lists Japanese.",
  },
  { label: "Similar to", value: PRESS_COMPS_LINE },
  {
    label: "Contact",
    value: PRESS_CONTACT_EMAIL,
    href: PRESS_CONTACT_MAILTO,
  },
];

export type PressLink = {
  id: string;
  label: string;
  href: string;
  group: "play" | "social" | "directory";
};

export const PRESS_LINKS: readonly PressLink[] = [
  { id: "web", label: "Play in browser", href: SITE, group: "play" },
  { id: "steam", label: "Steam", href: STEAM_URL, group: "play" },
  { id: "steam-demo", label: "Steam demo", href: STEAM_DEMO_URL, group: "play" },
  { id: "itch", label: "itch.io", href: ITCH_URL, group: "play" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/channel/UCdQDWTJe_Bno7xyjnO1aC-w", group: "social" },
  { id: "trailer", label: "Gameplay trailer", href: PRESS_TRAILER_YOUTUBE_URL, group: "social" },
  { id: "reddit", label: "Reddit", href: REDDIT_URL, group: "social" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/a_dark_cave/", group: "social" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/people/A-Dark-Cave/61584724119235/", group: "social" },
  { id: "email", label: "Email", href: PRESS_CONTACT_MAILTO, group: "social" },
  { id: "buymeacoffee", label: "Buy Me a Coffee", href: "https://buymeacoffee.com/julez.b", group: "social" },
  { id: "igdb", label: "IGDB", href: "https://www.igdb.com/games/a-dark-cave", group: "directory" },
  { id: "wikidata", label: "Wikidata", href: "https://www.wikidata.org/wiki/Q141133318", group: "directory" },
  { id: "mobygames", label: "MobyGames", href: "https://www.mobygames.com/game/255071/a-dark-cave/", group: "directory" },
  { id: "indiedb", label: "IndieDB", href: "https://www.indiedb.com/games/a-dark-cave", group: "directory" },
  { id: "moddb", label: "ModDB", href: "https://www.moddb.com/games/a-dark-cave", group: "directory" },
  { id: "incrementaldb", label: "IncrementalDB", href: "https://www.incrementaldb.com/game/a-dark-cave", group: "directory" },
  { id: "almostidle", label: "Almost Idle", href: "https://almostidle.com/game/a-dark-cave", group: "directory" },
  { id: "producthunt", label: "Product Hunt", href: "https://www.producthunt.com/products/a-dark-cave", group: "directory" },
  { id: "fandom", label: "Wiki", href: "https://a-dark-cave.fandom.com/wiki/A_Dark_Cave_Wiki", group: "directory" },
];

export type PressAssetKind = "logo" | "screenshot" | "capsule" | "video";

export type PressAsset = {
  id: string;
  kind: PressAssetKind;
  label: string;
  fileName: string;
  href: string;
  sizeHint?: string;
};

function asset(
  kind: PressAssetKind,
  fileName: string,
  label: string,
  extras?: Pick<PressAsset, "sizeHint">,
): PressAsset {
  return {
    id: fileName.replace(/\.[^.]+$/, ""),
    kind,
    label,
    fileName,
    href: `${PRESS_ASSET_DIR}/${kind === "video" ? "video/" : kind === "logo" ? "logos/" : kind === "capsule" ? "capsules/" : "screenshots/"}${fileName}`,
    ...extras,
  };
}

export const PRESS_LOGOS: readonly PressAsset[] = [
  asset("logo", "a_dark_cave_logo.png", "Logo (square)", {
    sizeHint: "Source icon",
  }),
];

export const PRESS_SCREENSHOTS: readonly PressAsset[] = [
  asset("screenshot", "a_dark_cave_screenshot_01.jpg", "Forest", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_02.jpg", "Bastion", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_03.jpg", "Village", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_04.jpg", "Estate", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_05.jpg", "Book of Trials", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_06.jpg", "Sleeping", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_07.jpg", "Combat", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_08.jpg", "The Witch's Curse", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_09.jpg", "The Hollow King Scepter", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_10.jpg", "Ring of the Drowned", {
    sizeHint: "1024 × 576",
  }),
  asset("screenshot", "a_dark_cave_screenshot_11.jpg", "The Exiled Scholar", {
    sizeHint: "1024 × 576",
  }),
];

export const PRESS_CAPSULES: readonly PressAsset[] = [
  asset("capsule", "a_dark_cave_main_capsule.jpg", "Wide capsule", {
    sizeHint: "1024 × 576",
  }),
  asset("capsule", "a_dark_cave_square_capsule.jpg", "Square capsule", {
    sizeHint: "800 × 800",
  }),
  asset("capsule", "a_dark_cave_library_capsule.jpg", "Library capsule", {
    sizeHint: "682 × 1024",
  }),
];

export const PRESS_VIDEOS: readonly PressAsset[] = [
  asset("video", "a_dark_cave_gameplay_trailer.mp4", "Gameplay trailer", {
    sizeHint: "MP4 download",
  }),
];

export const PRESS_ASSETS: readonly PressAsset[] = [
  ...PRESS_LOGOS,
  ...PRESS_CAPSULES,
  ...PRESS_SCREENSHOTS,
  ...PRESS_VIDEOS,
];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlAnchor(href: string, label: string, external = href.startsWith("http")): string {
  const extra = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a href="${escapeHtml(href)}"${extra}>${escapeHtml(label)}</a>`;
}

/** First-HTML body for crawlers (English). */
export function getPressPageInnerHtml(): string {
  const facts = PRESS_FACTS.map((fact) => {
    const value = fact.href
      ? htmlAnchor(fact.href, fact.value, fact.href.startsWith("http"))
      : escapeHtml(fact.value);
    return `<dt>${escapeHtml(fact.label)}</dt><dd>${value}</dd>`;
  }).join("");
  const links = PRESS_LINKS.map((link) => `<li>${htmlAnchor(link.href, link.label)}</li>`).join(
    "",
  );
  return [
    `<h1>${escapeHtml(PRESS_HEADING)}</h1>`,
    `<p><strong>${escapeHtml(PRESS_LOCKED_LINE)}</strong></p>`,
    `<h2>Short boilerplate</h2><p>${escapeHtml(PRESS_BOILERPLATE_SHORT)}</p>`,
    `<h2>Long boilerplate</h2><p>${escapeHtml(PRESS_BOILERPLATE_LONG)}</p>`,
    `<h2>Fact sheet</h2><dl>${facts}</dl>`,
    `<h2>Gameplay trailer</h2><p>${htmlAnchor(PRESS_TRAILER_YOUTUBE_URL, "YouTube")} · ${htmlAnchor(PRESS_TRAILER_FILE_HREF, "Download MP4", false)}</p>`,
    `<h2>Assets</h2><p>${htmlAnchor(PRESS_ZIP_HREF, "Download all assets (ZIP)", false)}</p>`,
    `<h2>Links</h2><ul>${links}</ul>`,
    `<h2>Permissions</h2><p>${escapeHtml(PRESS_PERMISSIONS)}</p>`,
    `<h2>Contact</h2><p>Julian Bauer. ${htmlAnchor(PRESS_CONTACT_MAILTO, PRESS_CONTACT_EMAIL, false)}</p>`,
  ].join("");
}
