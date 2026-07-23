/**
 * Delete every Resend contact at ~8 req/s with retries.
 * Usage: RESEND_API_KEY=... node tmp/resend-rebuild/delete-all.mjs
 */

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}` };
const MAX_PER_SEC = 8;

/** Simple sliding window rate limiter */
const timestamps = [];
async function acquire() {
  for (;;) {
    const now = Date.now();
    while (timestamps.length && now - timestamps[0] >= 1000) timestamps.shift();
    if (timestamps.length < MAX_PER_SEC) {
      timestamps.push(now);
      return;
    }
    const wait = 1000 - (now - timestamps[0]) + 5;
    await new Promise((r) => setTimeout(r, Math.max(wait, 20)));
  }
}

async function listAllIds() {
  const ids = [];
  let after = null;
  for (;;) {
    await acquire();
    const url = new URL("https://api.resend.com/contacts");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`List failed ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    for (const c of body.data ?? []) ids.push(c.id);
    if (!body.has_more || !(body.data?.length > 0)) break;
    after = body.data[body.data.length - 1].id;
  }
  return ids;
}

async function deleteOne(id) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await acquire();
    const res = await fetch(`https://api.resend.com/contacts/${id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok || res.status === 404) return true;
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    console.error(`Fail ${id}: ${res.status} ${await res.text()}`);
    return false;
  }
  return false;
}

async function main() {
  let pass = 0;
  let totalDeleted = 0;
  for (;;) {
    pass++;
    const ids = await listAllIds();
    console.log(`Pass ${pass}: found ${ids.length} contacts`);
    if (ids.length === 0) break;

    let deleted = 0;
    let failed = 0;
    const workers = 8;
    let i = 0;
    async function worker() {
      while (i < ids.length) {
        const idx = i++;
        const ok = await deleteOne(ids[idx]);
        if (ok) deleted++;
        else failed++;
        const done = deleted + failed;
        if (done % 100 === 0 || done === ids.length) {
          console.log(
            `  Progress: deleted=${deleted} failed=${failed} / ${ids.length}`,
          );
        }
      }
    }
    await Promise.all(Array.from({ length: workers }, () => worker()));
    totalDeleted += deleted;
    console.log(`Pass ${pass} done: deleted=${deleted} failed=${failed}`);
    if (failed > 0 && deleted === 0) {
      throw new Error("No progress deleting contacts (all failed)");
    }
  }
  console.log(`DONE total_deleted=${totalDeleted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
