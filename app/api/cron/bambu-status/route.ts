import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { bambuListDevices } from "@/lib/bambuCloud";
import { pollBambuDeviceOnce } from "@/lib/bambuMqttPoll";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron job — atualiza status das impressoras Bambu Lab conectadas (todas as
 * contas), rodando pelo Vercel Cron (vercel.json). Sem servidor separado: cada
 * execução abre uma conexão MQTT rápida por impressora, pega o snapshot atual
 * e fecha. Proteção: valida Authorization: Bearer {CRON_SECRET}.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[cron/bambu-status] CRON_SECRET não configurado.");
    return NextResponse.json({ error: "Servidor não configurado corretamente." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase service role não configurado." }, { status: 500 });
  }

  const { data: accounts, error } = await admin
    .from("bambu_cloud_accounts")
    .select("user_id, access_token, uid, region");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  let skipped = 0;

  for (const account of accounts ?? []) {
    if (!account.uid) {
      skipped++;
      continue; // login antigo sem uid salvo — precisa reconectar em /impressoras
    }

    const devicesResult = await bambuListDevices(account.region ?? "global", account.access_token);
    if (!devicesResult.ok) {
      skipped++;
      continue;
    }
    for (const device of devicesResult.devices) {
      const report = await pollBambuDeviceOnce(
        account.region ?? "global",
        account.uid,
        account.access_token,
        device.devId,
      );

      await admin.from("bambu_device_status").upsert(
        {
          user_id: account.user_id,
          dev_id: device.devId,
          name: device.name,
          online: device.online,
          print_status: report?.printStatus ?? null,
          progress_percent: report?.progressPercent ?? null,
          remaining_minutes: report?.remainingMinutes ?? null,
          nozzle_temper: report?.nozzleTemper ?? null,
          bed_temper: report?.bedTemper ?? null,
          raw: report?.raw ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,dev_id" },
      );
      updated++;
    }
  }

  return NextResponse.json({ ok: true, updated, skipped });
}
