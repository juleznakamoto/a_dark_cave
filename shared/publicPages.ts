/** First-HTML body + extra JSON-LD for public docs. English only. */

import { getLegalPageInnerHtml, getNotFoundPageInnerHtml } from "./publicLegalPages";

export const SITE = "https://a-dark-cave.com";
export const STEAM_URL = "https://store.steampowered.com/app/4882240/A_Dark_Cave/";
export const STEAM_DEMO_URL = "https://store.steampowered.com/app/4971800/";
export const ITCH_URL = "https://a-dark-cave.itch.io/a-dark-cave";
export const REDDIT_URL = "https://www.reddit.com/r/aDarkCave/";

/**
 * Same UTM as `STEAM_STORE_UTM_CONTENT.htmlNoscriptFooter` in
 * `client/src/lib/gameFooterSocialLinks.ts` (public / crawlable Steam CTAs).
 */
export function withPublicSteamUtm(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "a_dark_cave");
  url.searchParams.set("utm_medium", "web_game");
  url.searchParams.set("utm_campaign", "steam_store");
  url.searchParams.set("utm_content", "html_noscript_footer");
  return url.toString();
}

export const PUBLIC_STEAM_URL = withPublicSteamUtm(STEAM_URL);
export const PUBLIC_STEAM_DEMO_URL = withPublicSteamUtm(STEAM_DEMO_URL);

const EXTERNAL_ANCHOR_ATTRS = ' target="_blank" rel="noopener noreferrer"';

function htmlAnchor(
  href: string,
  labelHtml: string,
  options?: { external?: boolean },
): string {
  return `<a href="${escapeHtml(href)}"${options?.external ? EXTERNAL_ANCHOR_ATTRS : ""}>${labelHtml}</a>`;
}

export const FAQ_ITEM_IDS = [
  "whatIs",
  "free",
  "idle",
  "like",
  "phone",
  "steam",
  "download",
  "save",
  "account",
  "singlePlayer",
  "ending",
  "languages",
  "help",
] as const;

export type FaqItemId = (typeof FAQ_ITEM_IDS)[number];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type FaqItem = {
  question: string;
  answerText: string;
  answerHtml: string;
};

export const FAQ_HEADING = "Frequently asked questions";

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is A Dark Cave?",
    answerText:
      "A Dark Cave is a text-based incremental survival and settlement game. You wake in a cave with no memory, light a fire, gather resources, build a village, and descend into the dark.",
    answerHtml: "",
  },
  {
    question: "Is A Dark Cave free?",
    answerText:
      "Yes. You can play for free in your browser at a-dark-cave.com. There are fully optional purchases.",
    answerHtml: `Yes. You can play for free in your browser at <a href="${SITE}">a-dark-cave.com</a>. There are fully optional purchases.`,
  },
  {
    question: "Is it an idle or clicker game?",
    answerText:
      "No. It is an incremental game that is semi-idle and active. You make choices and manage a settlement. It is not a second-screen clicker.",
    answerHtml: "",
  },
  {
    question: "What games is it like?",
    answerText:
      "If you like A Dark Room, Kittens Game, The Ensign, Universal Paperclips, Candy Box, Level 13, or KEROS-9, this is aimed at that taste. It is not affiliated with them.",
    answerHtml: "",
  },
  {
    question: "Can I play on my phone?",
    answerText:
      "Yes, in a mobile browser. There is no App Store or Google Play app.",
    answerHtml: "",
  },
  {
    question: "Is there a Steam version?",
    answerText:
      "Yes. A Dark Cave is coming to Steam on 27 October 2026. A free demo is available now. The Steam edition is a paid game.",
    answerHtml: `Yes. A Dark Cave is coming to ${htmlAnchor(PUBLIC_STEAM_URL, "Steam", { external: true })} on 27 October 2026. A ${htmlAnchor(PUBLIC_STEAM_DEMO_URL, "free demo", { external: true })} is available now. The Steam edition is a paid game.`,
  },
  {
    question: "Do I need to download the browser game?",
    answerText: "No. Play it in the browser.",
    answerHtml: "",
  },
  {
    question: "Does my progress save?",
    answerText:
      "Yes. Progress saves automatically in the browser. An optional account adds cloud save.",
    answerHtml: "",
  },
  {
    question: "Do I need an account?",
    answerText:
      "No. You can play without one. An account is only for cloud save.",
    answerHtml: "",
  },
  {
    question: "Is it single-player?",
    answerText: "Yes. A Dark Cave is a single-player game.",
    answerHtml: "",
  },
  {
    question: "Does the game have an ending?",
    answerText:
      "Yes. There is a story, lots of secrets and lore, and more than one ending.",
    answerHtml: "",
  },
  {
    question: "What languages are supported?",
    answerText:
      "English, German, French, Spanish, Italian, Portuguese (Brazil), Simplified Chinese, and Russian in the browser. Steam also lists Japanese.",
    answerHtml: "",
  },
  {
    question: "Where can I get help?",
    answerText:
      "Email support@a-dark-cave.com or ask on the A Dark Cave subreddit.",
    answerHtml: `Email ${htmlAnchor("mailto:support@a-dark-cave.com", "support@a-dark-cave.com")} or ask on the ${htmlAnchor(REDDIT_URL, "A Dark Cave subreddit", { external: true })}.`,
  },
];

for (const item of FAQ_ITEMS) {
  if (!item.answerHtml) item.answerHtml = escapeHtml(item.answerText);
}

export const ABOUT_HEADING = "About A Dark Cave";

export const ABOUT_NAV_LINKS = [
  { id: "play", href: SITE, label: "Play", external: false },
  { id: "faq", href: "/faq", label: "FAQ", external: false },
  { id: "steam", href: PUBLIC_STEAM_URL, label: "Steam", external: true },
  { id: "reddit", href: REDDIT_URL, label: "Reddit", external: true },
] as const;

export type AboutNavLinkId = (typeof ABOUT_NAV_LINKS)[number]["id"];

const aboutSiteLink = htmlAnchor(SITE, "a-dark-cave.com");
const aboutDemoLink = (label: string) =>
  htmlAnchor(PUBLIC_STEAM_DEMO_URL, escapeHtml(label), { external: true });
const aboutSteamLink = htmlAnchor(PUBLIC_STEAM_URL, "Steam", { external: true });
const aboutEmailLink = htmlAnchor(
  "mailto:support@a-dark-cave.com",
  "support@a-dark-cave.com",
);

export const ABOUT_SECTIONS: {
  heading?: string;
  paragraphsHtml: readonly string[];
}[] = [
    {
      paragraphsHtml: [
        "I made this game because many years ago I played A Dark Room, which inspired me to create my own game one day. That day has come.",
        "You wake up at the entrance of a dark cave. No memory. No possessions. You make a fire, then gather some wood, craft a torch, build your first shelter. Strangers arrive. The settlement grows. You start to explore what is deep in the cave. The past of your civilization. Your past. That is A Dark Cave: a text incremental about surviving, building, and finding out what is actually down there, and maybe where we are heading as humanity.",
        `It is free in your browser: ${aboutSiteLink}. To support the game, there are fully optional purchases. There is a ${aboutDemoLink("Steam demo")} if you would rather play it that way. The full Steam version is planned for 27 October 2026.`,
      ],
    },
    {
      heading: "How it plays",
      paragraphsHtml: [
        "You start with nothing. You gradually unlock items, buildings, skills, jobs, fellowship members, and much more. A story unfolds, rich in lore, about the past of a civilization that lived before. You learn more the deeper you go into the cave. But danger also grows.",
        "The gameplay is active. You make decisions that influence the game. There is also an idle mode so the game can progress while you are away. The game has an ending, or maybe more than one.",
      ],
    },
    {
      heading: "If you liked older incremental games",
      paragraphsHtml: [
        "People usually find this from A Dark Room, Kittens Game, Universal Paperclips, Candy Box, and games like them. You will find some of the mechanics of these games in A Dark Cave as well. A Dark Cave is minimalistic in its graphics, but I handcrafted animations, added lots of sounds, and made it work on desktop and mobile so it fits the way we play now.",
      ],
    },
    {
      heading: "Who it is for",
      paragraphsHtml: [
        "It is for people who like games that start simple and get more complicated on purpose. Not because a tutorial dumped twenty systems on minute one, but because you earned the next one.",
        "If you want flashy graphics, this is the wrong tab. Most of the game is text, with some (hopefully) rewarding animations in between. I spent a lot of time crafting an interesting story that is deeply connected with our story and future.",
      ],
    },
    {
      heading: "Platforms",
      paragraphsHtml: [
        "Play on a desktop or mobile browser. There is no App Store or Google Play app. Progress saves on your device. You can make an account if you want a cloud save.",
        `${aboutSteamLink} (Windows) is a paid game with a ${aboutDemoLink("free demo")}. The browser game stays free.`,
        "The game is in English, German, French, Spanish, Italian, Portuguese (Brazil), Simplified Chinese, and Russian.",
      ],
    },
    {
      heading: "Who I am",
      paragraphsHtml: [
        `I am Julian Bauer. I built A Dark Cave by myself. If something is broken, or you just want to reach out, write to ${aboutEmailLink}.`,
      ],
    },
  ];

const STATIC_PAGE_STYLE = [
  "background:#111",
  "color:#eee",
  "max-width:48rem",
  "margin:0 auto",
  "padding:2rem 1.25rem 4rem",
  "font-family:system-ui,sans-serif",
  "line-height:1.55",
].join(";");

function faqBodyInnerHtml(): string {
  const items = FAQ_ITEMS.map(
    (item) =>
      `<section><h2>${escapeHtml(item.question)}</h2><p>${item.answerHtml}</p></section>`,
  ).join("");
  return `<h1>${escapeHtml(FAQ_HEADING)}</h1>${items}`;
}

function aboutBodyInnerHtml(): string {
  const sections = ABOUT_SECTIONS.map((section) => {
    const heading = section.heading
      ? `<h2>${escapeHtml(section.heading)}</h2>`
      : "";
    const paras = section.paragraphsHtml.map((html) => `<p>${html}</p>`).join("");
    return `${heading}${paras}`;
  }).join("");
  const nav = ABOUT_NAV_LINKS.map((link, index) => {
    const sep = index > 0 ? " · " : "";
    return `${sep}${htmlAnchor(link.href, escapeHtml(link.label), { external: link.external })}`;
  }).join("");
  return `<h1>${escapeHtml(ABOUT_HEADING)}</h1>${sections}<p>${nav}</p>`;
}

export function getPublicPageBodyHtml(
  path: string,
  options?: { notFound?: boolean },
): string | null {
  const inner = options?.notFound
    ? getNotFoundPageInnerHtml()
    : path === "/faq"
      ? faqBodyInnerHtml()
      : path === "/about"
        ? aboutBodyInnerHtml()
        : getLegalPageInnerHtml(path);
  if (!inner) return null;
  return `<main id="seo-fallback" style="${STATIC_PAGE_STYLE}">${inner}</main>`;
}

export function getPublicPageExtraJsonLd(path: string): string | null {
  if (path === "/faq") {
    const payload = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answerText,
        },
      })),
    };
    return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
  }
  if (path === "/about") {
    const payload = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "A Dark Cave",
          url: SITE,
          email: "support@a-dark-cave.com",
          founder: {
            "@type": "Person",
            name: "Julian Bauer",
          },
        },
      ],
    };
    return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
  }
  return null;
}

/** Hide the static body after React fills #root so users do not see a duplicate. */
export const STATIC_PAGE_HIDE_AFTER_HYDRATE = `<style id="adc-static-page-hide">#root:not(:empty)~#seo-fallback{display:none!important}</style>`;
