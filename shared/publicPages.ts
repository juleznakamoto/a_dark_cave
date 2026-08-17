/** First-HTML body + extra JSON-LD for /faq and /about. English only. */

export const SITE = "https://a-dark-cave.com";
export const STEAM_URL = "https://store.steampowered.com/app/4882240/A_Dark_Cave/";
export const STEAM_DEMO_URL = "https://store.steampowered.com/app/4971800/";
export const ITCH_URL = "https://a-dark-cave.itch.io/a-dark-cave";
export const REDDIT_URL = "https://www.reddit.com/r/aDarkCave/";

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
    answerHtml: `Yes. A Dark Cave is coming to <a href="${STEAM_URL}">Steam</a> on 27 October 2026. A <a href="${STEAM_DEMO_URL}">free demo</a> is available now. The Steam edition is a paid game.`,
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
    answerHtml: `Email <a href="mailto:support@a-dark-cave.com">support@a-dark-cave.com</a> or ask on the <a href="${REDDIT_URL}">A Dark Cave subreddit</a>.`,
  },
];

for (const item of FAQ_ITEMS) {
  if (!item.answerHtml) item.answerHtml = escapeHtml(item.answerText);
}

export const ABOUT_HEADING = "About A Dark Cave";

export const ABOUT_PARAGRAPHS_HTML = [
  "A Dark Cave is a text-based incremental survival and settlement game by Julian Bauer. You wake in the entrance of a cave, light a fire, gather what you can, build a village at the threshold, and go back down.",
  `Play for free in your browser at <a href="${SITE}">https://a-dark-cave.com</a>. A free Steam demo is available now. The full Steam release is planned for 27 October 2026.`,
  "It is built for people who like minimalist incrementals such as A Dark Room, Kittens Game, and Candy Box. It is not a clicker and not a second-screen idle game.",
] as const;

export const ABOUT_LINKS: { label: string; href: string }[] = [
  { label: "Support: support@a-dark-cave.com", href: "mailto:support@a-dark-cave.com" },
  { label: "Reddit", href: REDDIT_URL },
  { label: "Steam", href: STEAM_URL },
  { label: "itch.io", href: ITCH_URL },
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
  const paras = ABOUT_PARAGRAPHS_HTML.map((html) => `<p>${html}</p>`).join("");
  const links = ABOUT_LINKS.map(
    (link) =>
      `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`,
  ).join("");
  return `<h1>${escapeHtml(ABOUT_HEADING)}</h1>${paras}<ul>${links}</ul>`;
}

export function getPublicPageBodyHtml(path: string): string | null {
  const inner =
    path === "/faq"
      ? faqBodyInnerHtml()
      : path === "/about"
        ? aboutBodyInnerHtml()
        : null;
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
          "@type": "Person",
          name: "Julian Bauer",
          email: "support@a-dark-cave.com",
          url: `${SITE}/about`,
          jobTitle: "Game developer",
        },
        {
          "@type": "Organization",
          name: "A Dark Cave",
          url: SITE,
          email: "support@a-dark-cave.com",
          founder: { "@type": "Person", name: "Julian Bauer" },
        },
      ],
    };
    return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
  }
  return null;
}

/** Hide the static body after React fills #root so users do not see a duplicate. */
export const STATIC_PAGE_HIDE_AFTER_HYDRATE = `<style id="adc-static-page-hide">#root:not(:empty)~#seo-fallback{display:none!important}</style>`;
