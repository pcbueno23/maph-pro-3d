import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { bambuListDevices } from "@/lib/bambuCloud";
import { pollBambuDeviceOnce } from "@/lib/bambuMqttPoll";

export const dynamic = "force-dynamic";
// Precisa de folga pro poll MQTT de cada impressora (até 6s cada, em paralelo) — o
// painel de farm chama essa rota a cada ~15s, não dá pra depender só do cron diário
// (ver vercel.json) pra ter dado "ao vivo" de verdade.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }

  const { data: account, error: accErr } = await admin
    .from("bambu_cloud_accounts")
    .select("access_token, region, uid")
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

  // Poll MQTT ao vivo de cada impressora, em paralelo — sem isso, "status ao vivo"
  // ficava preso no que o cron diário capturou (até 24h desatualizado).
  const reports = account.uid
    ? await Promise.all(
        result.devices.map((d) =>
          pollBambuDeviceOnce(account.region ?? "global", account.uid, account.access_token, d.devId),
        ),
      )
    : result.devices.map(() => null);
  const reportByDevId = new Map(result.devices.map((d, i) => [d.devId, reports[i]] as const));

  const now = new Date().toISOString();
  if (result.devices.length > 0) {
    await admin.from("bambu_device_status").upsert(
      result.devices.map((d) => {
        const report = reportByDevId.get(d.devId);
        return {
          user_id: auth.user.id,
          dev_id: d.devId,
          name: d.name,
          online: d.online,
          print_status: report?.printStatus ?? null,
          progress_percent: report?.progressPercent ?? null,
          remaining_minutes: report?.remainingMinutes ?? null,
          nozzle_temper: report?.nozzleTemper ?? null,
          bed_temper: report?.bedTemper ?? null,
          raw: report?.raw ?? null,
          updated_at: now,
        };
      }),
      { onConflict: "user_id,dev_id" },
    );
  }

  const devices = result.devices.map((d) => {
    const report = reportByDevId.get(d.devId);
    return {
      ...d,
      printStatus: report?.printStatus ?? null,
      progressPercent: report?.progressPercent ?? null,
      remainingMinutes: report?.remainingMinutes ?? null,
      nozzleTemper: report?.nozzleTemper ?? null,
      nozzleTargetTemper: report?.nozzleTargetTemper ?? null,
      bedTemper: report?.bedTemper ?? null,
      bedTargetTemper: report?.bedTargetTemper ?? null,
      chamberTemper: report?.chamberTemper ?? null,
      layerNum: report?.layerNum ?? null,
      totalLayerNum: report?.totalLayerNum ?? null,
      fileName: report?.fileName ?? null,
      statusUpdatedAt: now,
    };
  });

  return NextResponse.json({ ok: true, devices });
}
