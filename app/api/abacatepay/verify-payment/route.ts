import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/adminApiAuth";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { listBillings } from "@/lib/abacatepay";

export const dynamic = "force-dynamic";

/**
 * Verifica se um billing específico está PAID e marca o usuário como pago.
 * Chamado pelo frontend ao retornar do checkout AbacatePay com ?success=1.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const abacateToken = process.env.ABACATEPAY_TOKEN?.trim();
  if (!abacateToken) {
    return NextResponse.json({ error: "AbacatePay não configurado." }, { status: 500 });
  }

  const { billingId } = (await req.json()) as { billingId?: string };
  if (!billingId) {
    return NextResponse.json({ error: "billingId obrigatório." }, { status: 400 });
  }

  // Verifica se o billing está PAID na API do AbacatePay
  let isPaid = false;
  try {
    const billings = await listBillings(abacateToken);
    const found = billings.find((b) => b.id === billingId);
    isPaid = !!found && String(found.status ?? "").toUpperCase() === "PAID";
  } catch (err) {
    console.error("[verify-payment] Erro ao listar billings:", err);
    return NextResponse.json({ error: "Erro ao verificar pagamento." }, { status: 500 });
  }

  if (!isPaid) {
    return NextResponse.json({ paid: false });
  }

  // Marca o usuário como pago no Supabase
  const admin = getSupabaseServiceRole();
  if (admin) {
    try {
      await admin.auth.admin.updateUserById(auth.user.id, {
        user_metadata: {
          ...auth.user.user_metadata,
          abacatepay_paid_at: new Date().toISOString(),
          abacatepay_paid_billing_id: billingId,
        },
      });
    } catch (err) {
      console.error("[verify-payment] Erro ao atualizar metadata:", err);
    }
  }

  return NextResponse.json({ paid: true });
}
