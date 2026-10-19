import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { anycubicListDevices } from "@/lib/anycubicCloud";
import { pollAnycubicDeviceOnce } from "@/lib/anycubicMqttPoll";

export const dynamic = "force-dynamic";
// Folga pro poll MQTT (até 8s) — só 1 impressora Anycubic por enquanto, mas mantém a mesma
// margem usada na rota equivalente da Bambu.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }

  const { data: account, error: accErr } = await admin
    .from("anycubic_cloud_accounts")
    .select("email, slicer_access_token, session_token")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 });
  if (!account) {
    return NextResponse.json({ error: "Nenhuma conta Anycubic conectada." }, { status: 404 });
  }

  // slicer_access_token vazio = conta conectada com o token do site (ver login/route.ts):
  // REST funciona, MQTT não.
  const isWebMode = !account.slicer_access_token;
  const result = await anycubicListDevices(account.session_token, isWebMode ? "web" : "slicer");
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Falha ao buscar impressoras na Anycubic — o token de sessão pode ter expirado.",
        anycubicStatus: result.status,
        anycubicBody: result.body,
      },
      { status: 502 },
    );
  }

  const polls = isWebMode
    ? result.devices.map(() => null)
    : await Promise.all(
        result.devices.map((d) =>
          pollAnycubicDeviceOnce(account.email, account.slicer_access_token, d.devId, d.machineType),
        ),
      );
  const pollByDevId = new Map(result.devices.map((d, i) => [d.devId, polls[i]] as const));

  const now = new Date().toISOString();
  if (result.devices.length > 0) {
    await admin.from("anycubic_device_status").upsert(
      result.devices.map((d) => {
        const report = pollByDevId.get(d.devId)?.report;
        return {
          user_id: auth.user.id,
          dev_id: d.devId,
          name: d.name,
          online: d.online,
          print_status: report?.printing != null ? (report.printing ? "printing" : "idle") : null,
          progress_percent: report?.progressPercent ?? null,
          remaining_minutes: report?.remainingMinutes ?? null,
          nozzle_temper: report?.nozzleTemper ?? d.nozzleTemper ?? null,
          bed_temper: report?.bedTemper ?? d.bedTemper ?? null,
          raw: report?.raw ?? null,
          updated_at: now,
        };
      }),
      { onConflict: "user_id,dev_id" },
    );
  }

  const devices = result.devices.map((d) => {
    const poll = pollByDevId.get(d.devId);
    const report = poll?.report;
    return {
      devId: d.devId,
      name: d.name,
      model: d.model,
      online: d.online,
      restIsPrinting: d.isPrinting,
      printing: report?.printing ?? null,
      progressPercent: report?.progressPercent ?? null,
      remainingMinutes: report?.remainingMinutes ?? null,
      elapsedMinutes: report?.elapsedMinutes ?? null,
      layerNum: report?.layerNum ?? null,
      totalLayerNum: report?.totalLayerNum ?? null,
      fileName: report?.fileName ?? null,
      nozzleTemper: report?.nozzleTemper ?? d.nozzleTemper ?? null,
      bedTemper: report?.bedTemper ?? d.bedTemper ?? null,
      statusUpdatedAt: now,
      pollDebug: poll?.debug ?? null,
      raw: report?.raw ?? null,
    };
  });

  return NextResponse.json({ ok: true, devices, devicesRawJson: result.rawJson });
}
