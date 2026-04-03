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
| `sha`     | string or `null` | Source control revision for this deployment when the host or CI provides one; otherwise `null`. |
| `builtAt` | string or `null` | Optional build timestamp when the deployment environment supplies it; otherwise `null`. |

Example (illustrative):

```json
{
  "version": "1.0.0",
  "sha": "a1b2c3d4e5f6…",
  "builtAt": "2026-04-03T12:00:00.000Z"
}
```

When comparing the live site to a Git branch, use `sha` when it is present; when it is `null`, the deployment may still be current but does not advertise a revision.

## Play

**[Play A Dark Cave](https://a-dark-cave.com)**

## License

**All rights reserved.**  
*A Dark Cave*, its writing, rules, presentation, and other creative material are not licensed for reuse or redistribution without permission. Third-party libraries and tools used by the project remain under their respective licenses.
