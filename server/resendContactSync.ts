import {
  attachUnsubscribeUrlsToMarketingRows,
  loadResendContactRowsSplit,
  RESEND_UNSUBSCRIBE_URL_PROPERTY,
  rowsToResendMarketingContactCsv,
} from "./resendContactCsv";
import type { AdminClient } from "./resendContactCsv";

const RESEND_IMPORTS_URL = "https://api.resend.com/contacts/imports";

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
  options: { includeUnsubscribeUrl?: boolean } = {},
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

export async function syncMarketingContactsToResend(
  admin: AdminClient,
  apiKey: string,
  options: { wait?: boolean } = {},
): Promise<{
  contactCount: number;
  importId: string;
  status?: ResendContactImportStatus;
}> {
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
