import { z } from "zod";
import { UTM_FIELD_MAX_LENGTH } from "./utmAttribution";

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
