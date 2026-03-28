import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminApiAuth";
import {
  getAffiliateById,
  updateAffiliate,
  getAffiliateConversions,
  getAffiliatePayouts,
  updateConversionStatus,
  updatePayoutStatus,
  createPayout,
  getAffiliateStats,
} from "@/lib/affiliates";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/affiliates/[id] — detalhes + conversões + saques
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const [affiliate, conversions, payouts, stats] = await Promise.all([
      getAffiliateById(id),
      getAffiliateConversions(id),
      getAffiliatePayouts(id),
      getAffiliateStats(id),
    ]);
    if (!affiliate) return NextResponse.json({ error: "Afiliado não encontrado." }, { status: 404 });
    return NextResponse.json({ affiliate, conversions, payouts, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao carregar afiliado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/admin/affiliates/[id] — editar afiliado, atualizar status de conversão/saque ou criar saque
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Ação: atualizar status de uma conversão
  if (body.action === "conversion_status") {
    const convId = body.conversion_id as string;
    const status = body.status as string;
    if (!convId || !["approved", "paid", "rejected"].includes(status))
      return NextResponse.json({ error: "conversion_id e status (approved|paid|rejected) obrigatórios." }, { status: 400 });
    try {
      await updateConversionStatus(convId, status as "approved" | "paid" | "rejected");
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Erro." }, { status: 500 });
    }
  }

  // Ação: atualizar status de um saque
  if (body.action === "payout_status") {
    const payoutId = body.payout_id as string;
    const status = body.status as string;
    if (!payoutId || !["processing", "paid", "rejected"].includes(status))
      return NextResponse.json({ error: "payout_id e status (processing|paid|rejected) obrigatórios." }, { status: 400 });
    try {
      await updatePayoutStatus(
        payoutId,
        status as "processing" | "paid" | "rejected",
        (body.notes as string) ?? null,
      );
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Erro." }, { status: 500 });
    }
  }

  // Ação: criar saque manual para o afiliado
  if (body.action === "create_payout") {
    const amount = body.amount_cents as number;
    if (!amount || amount <= 0)
      return NextResponse.json({ error: "amount_cents deve ser positivo." }, { status: 400 });
    try {
      const payout = await createPayout(id, amount);
      return NextResponse.json({ payout }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Erro." }, { status: 500 });
    }
  }

  // Ação padrão: editar dados do afiliado
  try {
    const affiliate = await updateAffiliate(id, {
      name: body.name as string | undefined,
      email: body.email as string | undefined,
      commission_rate: body.commission_rate as number | undefined,
      pix_key: body.pix_key as string | null | undefined,
      notes: body.notes as string | null | undefined,
      status: body.status as "active" | "suspended" | undefined,
    });
    return NextResponse.json({ affiliate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar afiliado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
