import { z } from "zod";

/** Max length for each UTM field (API + schema). */
export const UTM_FIELD_MAX_LENGTH = 128;

export const utmAttributionSchema = z
  .object({
    source: z.string().max(UTM_FIELD_MAX_LENGTH).nullable().default(null),
    medium: z.string().max(UTM_FIELD_MAX_LENGTH).nullable().default(null),
    campaign: z.string().max(UTM_FIELD_MAX_LENGTH).nullable().default(null),
    content: z.string().max(UTM_FIELD_MAX_LENGTH).nullable().default(null),
    term: z.string().max(UTM_FIELD_MAX_LENGTH).nullable().default(null),
    /** Wall-clock ms when first-touch attribution was written. */
    capturedAt: z.number().nullable().default(null),
  })
  .nullable()
  .default(null);

export type UtmAttribution = NonNullable<z.infer<typeof utmAttributionSchema>>;

/** Synthetic source used when only legacy `?c=` is present. */
export const LEGACY_GOOGLE_ADS_UTM_SOURCE = "google_ads";

export function sanitizeUtmField(
  value: unknown,
  maxLength = UTM_FIELD_MAX_LENGTH,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function hasUtmAttribution(
  attr: UtmAttribution | null | undefined,
): boolean {
  if (!attr) return false;
  return Boolean(
    attr.source || attr.medium || attr.campaign || attr.content || attr.term,
  );
}

export interface RawUtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  /** Legacy Google Ads short campaign id (`?c=`). */
  c?: string | null;
}

/**
 * Build first-touch attribution from URL params.
 * Legacy `c` becomes source=google_ads + campaign=<c> when campaign is otherwise empty.
 */
export function buildUtmAttributionFromParams(
  params: RawUtmParams,
  capturedAt: number = Date.now(),
): UtmAttribution | null {
  let source = sanitizeUtmField(params.utm_source);
  let medium = sanitizeUtmField(params.utm_medium);
  let campaign = sanitizeUtmField(params.utm_campaign);
  const content = sanitizeUtmField(params.utm_content);
  const term = sanitizeUtmField(params.utm_term);
  const legacyC = sanitizeUtmField(params.c);

  if (legacyC && !campaign) {
    campaign = legacyC;
    if (!source) source = LEGACY_GOOGLE_ADS_UTM_SOURCE;
  }

  const attr: UtmAttribution = {
    source,
    medium,
    campaign,
    content,
    term,
    capturedAt,
  };

  return hasUtmAttribution(attr) ? attr : null;
}

export function utmAttributionFromSearchParams(
  search: URLSearchParams,
  capturedAt: number = Date.now(),
): UtmAttribution | null {
  return buildUtmAttributionFromParams(
    {
      utm_source: search.get("utm_source"),
      utm_medium: search.get("utm_medium"),
      utm_campaign: search.get("utm_campaign"),
      utm_content: search.get("utm_content"),
      utm_term: search.get("utm_term"),
      c: search.get("c"),
    },
    capturedAt,
  );
}
