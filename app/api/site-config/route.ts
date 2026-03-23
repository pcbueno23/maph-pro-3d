import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  defaultSiteConfigData,
  parseSiteConfigData,
} from "@/lib/siteConfig";

/** Configuração pública (banner, links) — sem segredos. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json({ data: defaultSiteConfigData });
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("app_site_config")
    .select("data")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ data: defaultSiteConfigData });
  }

  return NextResponse.json({ data: parseSiteConfigData(data.data) });
}
