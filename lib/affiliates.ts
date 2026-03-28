import { createClient } from "@supabase/supabase-js";

function getServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Affiliate = {
  id: string;
  name: string;
  email: string;
  code: string;
  commission_rate: number;
  status: "active" | "suspended";
  pix_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateConversion = {
  id: string;
  affiliate_id: string;
  referred_user_email: string;
  plan: string;
  amount_cents: number;
  commission_cents: number;
  status: "pending" | "approved" | "paid" | "rejected";
  billing_id: string | null;
  created_at: string;
};

export type AffiliatePayout = {
  id: string;
  affiliate_id: string;
  amount_cents: number;
  status: "pending" | "processing" | "paid" | "rejected";
  notes: string | null;
  created_at: string;
  paid_at: string | null;
};

export type AffiliateStats = {
  totalConversions: number;
  pendingCommissionCents: number;
  approvedCommissionCents: number;
  paidOutCents: number;
};

// ---------------------------------------------------------------------------
// Affiliates CRUD
// ---------------------------------------------------------------------------

export async function listAffiliates(): Promise<Affiliate[]> {
  const sb = getServiceRole();
  if (!sb) return [];
  const { data, error } = await sb
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Affiliate[]) ?? [];
}

export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const sb = getServiceRole();
  if (!sb) return null;
  const { data, error } = await sb
    .from("affiliates")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as Affiliate;
}

export async function getAffiliateById(id: string): Promise<Affiliate | null> {
  const sb = getServiceRole();
  if (!sb) return null;
  const { data, error } = await sb
    .from("affiliates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Affiliate;
}

export async function createAffiliate(params: {
  name: string;
  email: string;
  code: string;
  commission_rate: number;
  pix_key?: string | null;
  notes?: string | null;
}): Promise<Affiliate> {
  const sb = getServiceRole();
  if (!sb) throw new Error("Supabase não configurado.");
  const { data, error } = await sb
    .from("affiliates")
    .insert({
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      code: params.code.trim().toUpperCase(),
      commission_rate: params.commission_rate,
      pix_key: params.pix_key?.trim() || null,
      notes: params.notes?.trim() || null,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Affiliate;
}

export async function updateAffiliate(
  id: string,
  params: Partial<{
    name: string;
    email: string;
    commission_rate: number;
    pix_key: string | null;
    notes: string | null;
    status: "active" | "suspended";
  }>,
): Promise<Affiliate> {
  const sb = getServiceRole();
  if (!sb) throw new Error("Supabase não configurado.");
  const { data, error } = await sb
    .from("affiliates")
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Affiliate;
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

export async function getAffiliateConversions(
  affiliateId: string,
): Promise<AffiliateConversion[]> {
  const sb = getServiceRole();
  if (!sb) return [];
  const { data, error } = await sb
    .from("affiliate_conversions")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AffiliateConversion[]) ?? [];
}

export async function createConversion(params: {
  affiliate_id: string;
  referred_user_email: string;
  plan: string;
  amount_cents: number;
  commission_cents: number;
  billing_id?: string | null;
}): Promise<void> {
  const sb = getServiceRole();
  if (!sb) throw new Error("Supabase não configurado.");

  // Dedup: não registrar a mesma cobrança duas vezes
  if (params.billing_id) {
    const { data: existing } = await sb
      .from("affiliate_conversions")
      .select("id")
      .eq("billing_id", params.billing_id)
      .maybeSingle();
    if (existing) return;
  }

  await sb.from("affiliate_conversions").insert({
    affiliate_id: params.affiliate_id,
    referred_user_email: params.referred_user_email,
    plan: params.plan,
    amount_cents: params.amount_cents,
    commission_cents: params.commission_cents,
    billing_id: params.billing_id ?? null,
    status: "pending",
  });
}

export async function updateConversionStatus(
  id: string,
  status: "approved" | "paid" | "rejected",
): Promise<void> {
  const sb = getServiceRole();
  if (!sb) throw new Error("Supabase não configurado.");
  const { error } = await sb
    .from("affiliate_conversions")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export async function getAffiliatePayouts(
  affiliateId: string,
): Promise<AffiliatePayout[]> {
  const sb = getServiceRole();
  if (!sb) return [];
  const { data, error } = await sb
    .from("affiliate_payouts")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AffiliatePayout[]) ?? [];
}

export async function createPayout(
  affiliateId: string,
  amountCents: number,
): Promise<AffiliatePayout> {
  const sb = getServiceRole();
  if (!sb) throw new Error("Supabase não configurado.");
  const { data, error } = await sb
    .from("affiliate_payouts")
    .insert({ affiliate_id: affiliateId, amount_cents: amountCents, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as AffiliatePayout;
}

export async function updatePayoutStatus(
  id: string,
  status: "processing" | "paid" | "rejected",
  notes?: string | null,
): Promise<void> {
  const sb = getServiceRole();
  if (!sb) throw new Error("Supabase não configurado.");
  const { error } = await sb
    .from("affiliate_payouts")
    .update({
      status,
      notes: notes ?? null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

export async function getAffiliateStats(affiliateId: string): Promise<AffiliateStats> {
  const [conversions, payouts] = await Promise.all([
    getAffiliateConversions(affiliateId),
    getAffiliatePayouts(affiliateId),
  ]);

  const totalConversions = conversions.length;
  const pendingCommissionCents = conversions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.commission_cents, 0);
  const approvedCommissionCents = conversions
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + c.commission_cents, 0);
  const paidOutCents = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0);

  return { totalConversions, pendingCommissionCents, approvedCommissionCents, paidOutCents };
}
