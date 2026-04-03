# A Dark Cave

**Survive the darkness. Build a settlement. See how far you can push a life carved out of stone.**

[A Dark Cave](https://a-dark-cave.com) is a **browser-based, text-driven survival and settlement game**. You start with almost nothing in the depths of an ancient cave, then grow from tending a fire into managing a village, workers, and expeditions into a wider world. Progression is **incremental**: new systems and choices unlock as you stabilize food, fuel, tools, and morale.

## Who it is for

Players who enjoy **narrative-forward incremental games**, **resource loops**, and **settlement management** without needing reflex-based action. The interface stays readable on desktop and mobile: the focus is on decisions, pacing, and discovery.

## Core gameplay

### The cave: survival first

You begin in darkness. Light and heat matter. Early play is about **staying alive**, **crafting basics**, and learning what the cave demands before you can think bigger.

### The village: structure and people

As you expand, you **construct buildings**, **assign work**, and balance **production chains**. The settlement is not just decoration: it is how you convert time and resources into resilience.

### The world: risk and reward

Exploration opens **new locations**, events, and long-term goals. Leaving safety trades preparation for possibility: the world reacts to what you bring and what you have already lost.

### Persistence

Progress is **saved automatically** in the browser so sessions can resume. Long runs reward planning; setbacks are part of the survival fantasy.

## Feature highlights

- **Text-first presentation** with a clean, minimalist UI
- **Incremental unlocks** that pace complexity alongside your settlement
- **Resource and worker management** with meaningful tradeoffs
- **Exploration and events** that complicate the “optimal” plan
- **Optional purchases** for players who want to support development or access certain conveniences and content in line with the live game

## Deployed version API

The live site exposes a small JSON endpoint you can use to see **which build is currently deployed**. It is intended for operators, support, and automated checks—not for gameplay.

**Endpoint (production):** `https://a-dark-cave.com/api/version`  
**Method:** `GET`  
**Caching:** Responses use `Cache-Control: no-store` so proxies and browsers should not cache a stale build identifier.

### Response shape

| Field     | Type             | Meaning |
| --------- | ---------------- | ------- |
| `version` | string           | Package semver for the deployment (from the project’s published version label). |
| `sha`     | string or `null` | Git commit of the **built** snapshot (`git rev-parse HEAD` recorded when `npm run build` finishes), unless a host env var overrides it. `null` if the build ran without a Git checkout. |
| `builtAt` | string or `null` | ISO time when that build metadata was written, unless overridden by the deployment environment. |

Example (illustrative):

```json
{
  "version": "1.0.0",
  "sha": "a1b2c3d4e5f6…",
  "builtAt": "2026-04-03T12:00:00.000Z"
}
```

### Matching production to GitHub

After each production build, `sha` is the full commit hash of the tree that was built. Compare it to the tip of your branch (for example the `sha` field from GitHub’s API for `GET /repos/<owner>/<repo>/commits/<branch>`). If they are equal, the deployed bundle was produced from that commit.

Some hosts omit the `.git` directory from the build environment; in that case `sha` may be `null` until the pipeline is adjusted so `git rev-parse HEAD` can run during `npm run build`.

## Play

**[Play A Dark Cave](https://a-dark-cave.com)**

## License

**All rights reserved.**  
*A Dark Cave*, its writing, rules, presentation, and other creative material are not licensed for reuse or redistribution without permission. Third-party libraries and tools used by the project remain under their respective licenses.
