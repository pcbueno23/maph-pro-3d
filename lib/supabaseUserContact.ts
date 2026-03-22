import { supabase } from "@/lib/supabaseClient";

function mustClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

/** Telefone salvo em public.user_contact (fonte de verdade para contato). */
export async function fetchUserContact(userId: string): Promise<string | null> {
  const client = mustClient();
  const { data, error } = await client
    .from("user_contact")
    .select("phone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === "development") console.error("[user_contact]", error);
    return null;
  }
  const p = data?.phone;
  return typeof p === "string" && p.trim() ? p.trim() : null;
}

export async function upsertUserContact(userId: string, phone: string): Promise<void> {
  const client = mustClient();
  const { error } = await client.from("user_contact").upsert(
    {
      user_id: userId,
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
