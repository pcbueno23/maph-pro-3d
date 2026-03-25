import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.string().url().optional(),
);

export const siteConfigDataSchema = z.object({
  support_whatsapp_link: optionalUrl,
  support_whatsapp_display: z.string().optional(),
  terms_url: optionalUrl,
  banner_enabled: z.boolean().optional(),
  banner_title: z.string().optional(),
  banner_message: z.string().optional(),
  plan_price_pro_cents: z.number().int().positive().optional(),
  plan_price_business_cents: z.number().int().positive().optional(),
});

export type SiteConfigData = z.infer<typeof siteConfigDataSchema>;

export const defaultSiteConfigData: SiteConfigData = {
  banner_enabled: false,
  banner_title: "",
  banner_message: "",
};

export function parseSiteConfigData(raw: unknown): SiteConfigData {
  const parsed = siteConfigDataSchema.safeParse(raw ?? {});
  if (!parsed.success) return { ...defaultSiteConfigData };
  const d = parsed.data;
  return {
    ...defaultSiteConfigData,
    ...d,
    banner_enabled: d.banner_enabled ?? false,
  };
}
