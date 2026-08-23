# A Dark Cave: canonical facts

This file is the only allowed source for first-party marketing and SEO claims
(price, genre, platforms, comps, release dates, identity). If site copy, JSON-LD,
`llms.txt`, or meta tags disagree with this file, this file wins.

Do not invent listings, reviews, prices, or platforms. If live game code
conflicts with a claim here, update this file to match the code.

---

## Identity

| Field | Value |
| --- | --- |
| Name | A Dark Cave |
| Developer / publisher | Julian Bauer |
| Official site | https://a-dark-cave.com |
| Steam | https://store.steampowered.com/app/4882240/A_Dark_Cave/ (app **4882240**) |
| Steam demo | app **4971800**, available now |
| itch.io | https://a-dark-cave.itch.io/a-dark-cave |
| IGDB | https://www.igdb.com/games/a-dark-cave |
| Wikidata | https://www.wikidata.org/wiki/Q141133318 (Q141133318) |
| Reddit | u/Pure-Map-6717, https://www.reddit.com/r/aDarkCave/ |
| Support | support@a-dark-cave.com |

Not on Google Play or the App Store. Browser play works on desktop and mobile
browsers. Never imply a native mobile app.

Do not use `alternateName` values such as "Dark Cave Game". Those collide with
*The Dark Cave* (Steam 2758350) and *Saboteur: The Dark Cave*.

---

## What the game is

Text-based survival and settlement-building incremental.

The player wakes in a cave, lights a fire, gathers resources, crafts, builds a
village, and descends into the cave.

Semi-idle + active. Players make choices and manage a settlement. It is not a
full idle game, not a second-screen game, and not a clicker.

**Player-facing genre:** Incremental. Official Steam store genres today are
Adventure, Indie, Simulation, Strategy. Incremental must appear in site copy
and schema. Do not replace Incremental with Idle. Do not list Idle as a
marketing genre.

Internal gameplay names (for example idle-mode production) may stay in code.
Do not surface Idle as a directory or LLM genre.

### Close comps

Use only these, and only when a comparison is needed:

A Dark Room, Kittens Game, The Ensign, Universal Paperclips, Candy Box, Level 13, KEROS-9.

Do not lead with Darkest Dungeon, Dark Souls, or RuneScape. Darkest Dungeon may
stay as atmosphere only in a longer "inspired by" sentence. Do not put it in
the primary comp list.

---

## Price and platforms

### Browser (https://a-dark-cave.com)

You can play for free in the browser. Say that. Do not mention optional
purchases, unlocks, IAP, or MTX in marketing, SEO, or LLM copy. Purchases
exist in the shop (including paid Cruel Mode) but they are optional and
should stay out of first-party descriptions.

Do not describe the browser game as a paid product. Do not say "nothing to
buy", "no IAP", or "free with no MTX".

**Allowed phrases**

- Play for free.
- Play for free in your browser.
- Play for free in your browser on desktop or mobile.

**Forbidden phrases**

- Play in your browser, with optional unlocks.
- Free to play with optional unlocks / optional in-game purchases (in
  player-facing copy)
- JSON-LD `offers.price: "0"` as the only offer (keep a separate Steam
  PreOrder offer so web and Steam are not collapsed into one free price)

### Steam

Paid game (price not public yet). Free demo. Planned release **27 October 2026**.
Windows. Not "coming 31 December 2026" and not "Q4 2026" as the only date.

Do not describe Steam as free.

### itch.io

Name-your-own-price download. Do not treat itch as the canonical price.

---

## Release dates

Do not write a single "released on" date that collapses web and Steam.

| Edition | Date |
| --- | --- |
| Browser / web | Already live. Web listing date: **17 November 2025**. |
| Steam | Planned **27 October 2026**. Demo is out now. |

---

## Languages

Site UI languages: English, German, French, Spanish, Italian, Portuguese
(Brazil), Simplified Chinese, Russian.

`html lang` stays `en` for the default document unless the app already switches
it per locale. Do not add hreflang unless a later SEO pass asks for it.

---

## Required first-party copy

### Title (keep; it already ranks)

`A Dark Cave - Survive the Darkness, Build Your Settlement`

Do not add "free". Optional longer H1 in the hidden `#seo-fallback` (not the
`<title>`):

`A Dark Cave – Text-Based Survival and Incremental Settlement Game`

### Meta / OG / Twitter description

`A text-based incremental survival game. Light a fire, gather resources, build a settlement, and descend into the cave. Play for free in your browser. Steam demo available.`

### `#seo-fallback` intro

`A Dark Cave is a text-based survival and settlement-building incremental you can play for free in your browser on desktop or mobile. Light a fire in an ancient cave, gather resources, recruit companions, and uncover what lives below. Inspired by minimalist incrementals such as A Dark Room, Kittens Game, and Candy Box. Also on Steam with a free demo.`

H2: `Play for Free in Your Browser`.

### JSON-LD genre

`["Incremental", "Strategy", "Survival", "Settlement Builder", "Resource Management", "Text-Based"]`

Remove `Idle`. Do not use a lone `offers.price: "0"`. Prefer a browser offer
described as play-for-free, plus a Steam offer without a fake price
(PreOrder / URL to the Steam page).

`VideoGame` should include `image` (`https://a-dark-cave.com/og-image-1200x630.png`),
`author` (Julian Bauer), `gamePlatform` including `"Web Browser"` and `"PC"`,
`sameAs` at least Steam + itch + official site, web `datePublished`:
`2025-11-17` if a published date is needed. Keep `playMode: SinglePlayer`.

Keep existing real `sameAs` profile URLs (Reddit, IncrementalDB, IGDB, itch, IndieDB,
Instagram, Fandom, YouTube, Product Hunt, Facebook, Almost Idle, ModDB,
MobyGames, Wikidata, Buy Me a Coffee). Do not add Wikipedia or RAWG.

Organization `logo` may keep `/og-image.png` until a real wordmark exists.

---

## Verified in this repo (do not guess beyond this)

- Cruel Mode (`cruel_mode` in `shared/shopItems.ts`) is still a paid shop item
  (4.99 EUR). Optional paid unlocks are accurate.
- The old web `full_game` buy-to-play SKU is retired. Web is MTX-only now.
  Steam/Galaxy still use `full_game` as an entitlement key, not a shop SKU.
  Do not say "optional full game unlock" for the browser game.
- Steam app IDs: full game `4882240`, demo `4971800` (`steam_appid.txt`,
  `steam_appid_demo.txt`).
- Steam trailer movie id `257368796` is **not** stored in this repo. Do not
  invent a `trailer` URL until that asset is added here.
- UI locales live under `client/src/i18n/locales/` as `en`, `de`, `fr`, `es`,
  `it`, `pt-BR`, `zh-CN`, `ru`.
