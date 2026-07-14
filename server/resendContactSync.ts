import {
  attachUnsubscribeUrlsToMarketingRows,
  loadResendContactRowsSplit,
  RESEND_UNSUBSCRIBE_URL_PROPERTY,
  rowsToResendMarketingContactCsv,
} from "./resendContactCsv";
import type { AdminClient, ResendMarketingContactRow } from "./resendContactCsv";

const RESEND_IMPORTS_URL = "https://api.resend.com/contacts/imports";
const RESEND_CONTACT_PROPERTIES_URL = "https://api.resend.com/contact-properties";
const RESEND_SEGMENTS_URL = "https://api.resend.com/segments";

export type ResendSegment = { id: string; name: string };

/** List all Resend segments (used for idempotent find-or-create by name). */
export async function listResendSegments(apiKey: string): Promise<ResendSegment[]> {
  const res = await fetch(RESEND_SEGMENTS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: ResendSegment[];
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Resend list segments failed (${res.status})`,
    );
  }
  return body.data ?? [];
}

/** Create a Resend segment, returning its id. */
export async function createResendSegment(
  name: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(RESEND_SEGMENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok || !body.id?.trim()) {
    throw new Error(
      body.message ?? body.error ?? `Resend create segment failed (${res.status})`,
    );
  }
  return body.id;
}

/** Reuse an existing segment with the same name, else create it. */
export async function findOrCreateResendSegment(
  name: string,
  apiKey: string,
): Promise<{ id: string; created: boolean }> {
  const existing = (await listResendSegments(apiKey)).find(
    (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (existing) return { id: existing.id, created: false };
  return { id: await createResendSegment(name, apiKey), created: true };
}

/**
 * Ensure the `unsubscribe_url` Contact Property exists in Resend.
 *
 * Resend only attaches an imported property value if the property key already
 * exists account-wide (otherwise the column is silently dropped and broadcast
 * `{{{contact.unsubscribe_url}}}` renders empty). Creating it is idempotent:
 * an "already exists" conflict is treated as success.
 */
export async function ensureResendUnsubscribeUrlProperty(
  apiKey: string,
): Promise<void> {
  const res = await fetch(RESEND_CONTACT_PROPERTIES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: RESEND_UNSUBSCRIBE_URL_PROPERTY,
      type: "string",
    }),
  });
  if (res.ok || res.status === 409) return;

  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    name?: string;
  };
  const detail = body.message ?? body.error ?? body.name ?? "";
  // Some Resend responses signal a duplicate via message/name rather than 409.
  if (/already exists|duplicate|conflict/i.test(detail)) return;
  throw new Error(
    detail || `Failed to create Resend contact property (${res.status})`,
  );
}

export type ResendContactImportStatus = {
  id: string;
  status?: string;
  total_contacts?: number;
  imported_contacts?: number;
  failed_contacts?: number;
  counts?: {
    total?: number;
    created?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
  };
  error?: string;
};

function marketingImportColumnMap(includeUnsubscribeUrl: boolean): string {
  const map: Record<string, unknown> = {
    email: "email",
    firstName: "first_name",
    lastName: "last_name",
  };
  if (includeUnsubscribeUrl) {
    map.properties = {
      [RESEND_UNSUBSCRIBE_URL_PROPERTY]: {
        column: RESEND_UNSUBSCRIBE_URL_PROPERTY,
        type: "string",
      },
    };
  }
  return JSON.stringify(map);
}

export async function createResendMarketingContactImport(
  csv: string,
  apiKey: string,
  options: { includeUnsubscribeUrl?: boolean; segmentIds?: string[] } = {},
): Promise<{ importId: string }> {
  const includeUnsubscribeUrl = options.includeUnsubscribeUrl !== false;
  const form = new FormData();
  form.append(
    "file",
    new Blob([csv], { type: "text/csv" }),
    "resend-marketing-opt-in.csv",
  );
  form.append("column_map", marketingImportColumnMap(includeUnsubscribeUrl));
  form.append("on_conflict", "upsert");
  if (options.segmentIds?.length) {
    form.append(
      "segments",
      JSON.stringify(options.segmentIds.map((id) => ({ id }))),
    );
  }

  const res = await fetch(RESEND_IMPORTS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const body = (await res.json()) as {
    id?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Resend import failed (${res.status})`,
    );
  }
  if (!body.id?.trim()) {
    throw new Error("Resend import response missing id");
  }
  return { importId: body.id };
}

export async function getResendContactImportStatus(
  importId: string,
  apiKey: string,
): Promise<ResendContactImportStatus> {
  const res = await fetch(`${RESEND_IMPORTS_URL}/${importId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = (await res.json()) as ResendContactImportStatus & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Resend import status failed (${res.status})`,
    );
  }
  return body;
}

export async function waitForResendContactImport(
  importId: string,
  apiKey: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<ResendContactImportStatus> {
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const pollMs = options.pollMs ?? 3000;
  const started = Date.now();

  for (; ;) {
    const status = await getResendContactImportStatus(importId, apiKey);
    const state = (status.status ?? "").toLowerCase();
    if (
      state === "completed" ||
      state === "failed" ||
      state === "cancelled" ||
      state === "canceled"
    ) {
      return status;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(
        `Timed out waiting for Resend import ${importId} (last status: ${status.status ?? "unknown"})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

/**
 * Import a pre-built set of marketing rows into a specific Resend segment.
 *
 * Rows must already be ordered as desired (the import preserves CSV row order).
 * Each row is given a fresh Supabase unsubscribe token so broadcasts can render
 * `{{{contact.unsubscribe_url}}}`. `on_conflict=upsert` makes re-runs safe.
 */
export async function importMarketingRowsToResendSegment(
  admin: AdminClient,
  apiKey: string,
  rows: ResendMarketingContactRow[],
  segmentId: string,
  options: { wait?: boolean } = {},
): Promise<{
  contactCount: number;
  importId: string;
  status?: ResendContactImportStatus;
}> {
  await ensureResendUnsubscribeUrlProperty(apiKey);
  await attachUnsubscribeUrlsToMarketingRows(admin, rows);
  const csv = rowsToResendMarketingContactCsv(rows);
  const { importId } = await createResendMarketingContactImport(csv, apiKey, {
    segmentIds: [segmentId],
  });
  if (!options.wait) {
    return { contactCount: rows.length, importId };
  }
  const status = await waitForResendContactImport(importId, apiKey);
  if ((status.status ?? "").toLowerCase() === "failed") {
    throw new Error(
      status.error ??
      `Resend import ${importId} failed (${status.failed_contacts ?? 0} failed)`,
    );
  }
  return { contactCount: rows.length, importId, status };
}

export async function syncMarketingContactsToResend(
  admin: AdminClient,
  apiKey: string,
  options: { wait?: boolean } = {},
): Promise<{
  contactCount: number;
  importId: string;
  status?: ResendContactImportStatus;
}> {
  await ensureResendUnsubscribeUrlProperty(apiKey);
  const { marketing } = await loadResendContactRowsSplit(admin);
  await attachUnsubscribeUrlsToMarketingRows(admin, marketing);
  const csv = rowsToResendMarketingContactCsv(marketing);
  const { importId } = await createResendMarketingContactImport(csv, apiKey);
  if (!options.wait) {
    return { contactCount: marketing.length, importId };
  }
  const status = await waitForResendContactImport(importId, apiKey);
  if ((status.status ?? "").toLowerCase() === "failed") {
    throw new Error(
      status.error ??
      `Resend import ${importId} failed (${status.failed_contacts ?? 0} failed)`,
    );
  }
  return { contactCount: marketing.length, importId, status };
}
