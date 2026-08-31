import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { bambuListDevices } from "@/lib/bambuCloud";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }

  const { data: account, error: accErr } = await admin
    .from("bambu_cloud_accounts")
    .select("access_token, region")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 });
  if (!account) {
    return NextResponse.json({ error: "Nenhuma conta Bambu Lab conectada." }, { status: 404 });
  }

  const result = await bambuListDevices(account.region ?? "global", account.access_token);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Falha ao buscar impressoras na Bambu Lab.", bambuStatus: result.status, bambuBody: result.body },
      { status: 502 },
    );
  }

  const now = new Date().toISOString();
  if (result.devices.length > 0) {
    await admin.from("bambu_device_status").upsert(
      result.devices.map((d) => ({
        user_id: auth.user.id,
        dev_id: d.devId,
        name: d.name,
        online: d.online,
        updated_at: now,
      })),
      { onConflict: "user_id,dev_id" },
    );
  }

  // Junta com o último status gravado pelo cron (progresso/temperatura), quando houver.
  const { data: statusRows } = await admin
    .from("bambu_device_status")
    .select("dev_id, print_status, progress_percent, remaining_minutes, nozzle_temper, bed_temper, updated_at")
    .eq("user_id", auth.user.id);
  const statusByDevId = new Map((statusRows ?? []).map((s) => [s.dev_id, s] as const));

  const devices = result.devices.map((d) => {
    const s = statusByDevId.get(d.devId);
    return {
      ...d,
      printStatus: s?.print_status ?? null,
      progressPercent: s?.progress_percent ?? null,
      remainingMinutes: s?.remaining_minutes ?? null,
      nozzleTemper: s?.nozzle_temper ?? null,
      bedTemper: s?.bed_temper ?? null,
      statusUpdatedAt: s?.updated_at ?? null,
    };
  });

  return NextResponse.json({ ok: true, devices });
}
