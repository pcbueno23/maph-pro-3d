import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do worker.");
}

export const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type BambuAccountRow = {
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  uid: string | null;
  region: string;
};

export async function listBambuAccounts(): Promise<BambuAccountRow[]> {
  const { data, error } = await supabase
    .from("bambu_cloud_accounts")
    .select("user_id, email, access_token, refresh_token, uid, region");
  if (error) throw error;
  return data ?? [];
}

export async function upsertDeviceStatus(params: {
  userId: string;
  devId: string;
  name?: string | null;
  online?: boolean;
  printStatus?: string | null;
  progressPercent?: number | null;
  remainingMinutes?: number | null;
  nozzleTemper?: number | null;
  bedTemper?: number | null;
  raw?: unknown;
}) {
  const { error } = await supabase.from("bambu_device_status").upsert(
    {
      user_id: params.userId,
      dev_id: params.devId,
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.online !== undefined ? { online: params.online } : {}),
      print_status: params.printStatus ?? null,
      progress_percent: params.progressPercent ?? null,
      remaining_minutes: params.remainingMinutes ?? null,
      nozzle_temper: params.nozzleTemper ?? null,
      bed_temper: params.bedTemper ?? null,
      raw: params.raw ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,dev_id" },
  );
  if (error) console.error(`[supabase] falha ao gravar status de ${params.devId}:`, error.message);
}
