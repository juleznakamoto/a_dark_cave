/**
 * Delete every Resend contact in parallel, up to the account rate limit.
 *
 * Resend has no bulk-delete endpoint. One DELETE per contact, 10 at a time,
 * finishes about 1000 contacts in two minutes. Prints counts only.
 *
 * Env: RESEND_API_KEY_PROD, RESEND_API_KEY, or a Bearer token in .cursor/mcp.json
 *
 * CLI: tsx scripts/clear-resend-contacts.ts
 */

import { getResendApiKey } from "./resendScriptEnv";

const RATE_PER_SEC = 10;
const WORKERS = 10;

function createRateLimiter(maxPerSec: number): () => Promise<void> {
  const timestamps: number[] = [];
  return async () => {
    for (;;) {
      const now = Date.now();
      while (timestamps.length && now - timestamps[0]! >= 1000) timestamps.shift();
      if (timestamps.length < maxPerSec) {
        timestamps.push(now);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
}

async function listContactIds(apiKey: string): Promise<string[]> {
  const ids: string[] = [];
  let after: string | null = null;
  const acquire = createRateLimiter(4);
  for (;;) {
    await acquire();
    const url = new URL("https://api.resend.com/contacts");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    let res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    for (let attempt = 0; res.status === 429 && attempt < 8; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      await acquire();
      res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    }
    if (!res.ok) throw new Error(`List contacts failed (${res.status})`);
    const body = (await res.json()) as { data?: { id: string }[]; has_more?: boolean };
    const page = body.data ?? [];
    for (const contact of page) ids.push(contact.id);
    if (!body.has_more || page.length === 0) break;
    after = page[page.length - 1]!.id;
  }
  return ids;
}

async function deleteAllContacts(apiKey: string): Promise<number> {
  let totalDeleted = 0;
  for (let pass = 1; ; pass++) {
    const ids = await listContactIds(apiKey);
    console.log(`Delete pass ${pass}: ${ids.length} contacts`);
    if (!ids.length) break;
    let deleted = 0;
    let failed = 0;
    let next = 0;
    const acquire = createRateLimiter(RATE_PER_SEC);
    async function worker(): Promise<void> {
      while (next < ids.length) {
        const index = next++;
        const id = ids[index]!;
        let ok = false;
        for (let attempt = 0; attempt < 8; attempt++) {
          await acquire();
          const res = await fetch(`https://api.resend.com/contacts/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (res.ok || res.status === 404) {
            ok = true;
            break;
          }
          if (res.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          break;
        }
        if (ok) deleted++;
        else failed++;
        const done = deleted + failed;
        if (done % 200 === 0 || done === ids.length) {
          console.log(`  deleted=${deleted} failed=${failed} / ${ids.length}`);
        }
      }
    }
    await Promise.all(Array.from({ length: WORKERS }, () => worker()));
    totalDeleted += deleted;
    if (failed > 0 && deleted === 0) throw new Error("Delete stalled");
  }
  return totalDeleted;
}

async function main(): Promise<void> {
  const apiKey = getResendApiKey();
  const deleted = await deleteAllContacts(apiKey);
  console.log(`Cleared ${deleted} contacts`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
