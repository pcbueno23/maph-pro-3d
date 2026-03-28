import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { listBillings } from "@/lib/abacatepay";
import { getAffiliateByCode, createConversion } from "@/lib/affiliates";
import { PLAN_PRICING } from "@/lib/planPricing";

export const dynamic = "force-dynamic";

/**
 * Webhook AbacatePay — recebe notificações de pagamento confirmado (BILLING_PAID).
 *
 * Configuração no painel AbacatePay:
 *   URL: https://seu-dominio.com/api/abacatepay/webhook
 *
 * Segurança: verifica o status do billing diretamente na API do AbacatePay
 * antes de marcar o usuário como pago, evitando webhooks falsos.
 */

interface AbacatePayWebhookPayload {
  event?: string;
  data?: {
    billing?: BillingData;
  };
  // Alguns provedores enviam o billing diretamente na raiz
  id?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  customer?: { email?: string; metadata?: { email?: string } } | null;
  products?: Array<{ id?: string; externalId?: string }>;
}

interface BillingData {
  id?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  customer?: { email?: string; metadata?: { email?: string } } | null;
  products?: Array<{ id?: string; externalId?: string }>;
  amount?: number;
}

function extractBillingFromPayload(body: AbacatePayWebhookPayload): BillingData | null {
  // Formato { event, data: { billing: {...} } }
  if (body.data?.billing) return body.data.billing;

  // Formato com billing diretamente na raiz do payload
  if (body.id && body.status) {
    return {
      id: body.id,
      status: body.status,
      metadata: body.metadata,
      customer: body.customer,
      products: body.products,
    };
  }

  return null;
}

function extractUserEmail(billing: BillingData): string | null {
  // Prioridade: metadata.app_user_email (gravado no checkout) > customer.email
  const meta = billing.metadata;
  if (meta && typeof meta.app_user_email === "string" && meta.app_user_email.trim()) {
    return meta.app_user_email.trim().toLowerCase();
  }
  const c = billing.customer;
  if (!c) return null;
  if (c.email?.trim()) return c.email.trim().toLowerCase();
  if (c.metadata?.email?.trim()) return c.metadata.email.trim().toLowerCase();
  return null;
}

export async function POST(req: NextRequest) {
  const abacateToken = process.env.ABACATEPAY_TOKEN?.trim();

  let body: AbacatePayWebhookPayload;
  try {
    body = (await req.json()) as AbacatePayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const billing = extractBillingFromPayload(body);
  if (!billing) {
    // Payload desconhecido — aceitar silenciosamente para não gerar reenvios
    return NextResponse.json({ ok: true });
  }

  const status = String(billing.status ?? "").toUpperCase();

  if (status !== "PAID") {
    // Evento não é de pagamento confirmado — aceitar para não gerar reenvios
    return NextResponse.json({ ok: true });
  }

  // Verifica o billing diretamente na API do AbacatePay para evitar webhooks falsos.
  // Se a chave estiver disponível, confirma que o billing existe e está PAID.
  if (abacateToken && billing.id) {
    try {
      const billings = await listBillings(abacateToken);
      const found = billings.find((b) => b.id === billing.id);
      if (!found || String(found.status ?? "").toUpperCase() !== "PAID") {
        console.warn("[abacatepay/webhook] Billing não encontrado ou não PAID na API:", billing.id);
        return NextResponse.json({ ok: true });
      }
    } catch (err) {
      // Se a verificação falhar por erro de rede, continua — evita perder evento real
      console.error("[abacatepay/webhook] Erro ao verificar billing na API:", err);
    }
  }

  const email = extractUserEmail(billing);
  if (!email) {
    // Sem e-mail identificável — logar e aceitar
    console.warn("[abacatepay/webhook] Billing PAID sem e-mail identificável:", billing.id);
    return NextResponse.json({ ok: true });
  }

  // Atualiza o user_metadata do Supabase para acelerar o próximo check de acesso.
  // O campo abacatepay_paid_at serve como cache — o /api/account/access ainda
  // consulta listBillings como fonte de verdade, mas o polling pós-checkout
  // termina mais rápido quando esse campo já está preenchido.
  try {
    const admin = getSupabaseServiceRole();
    if (admin) {
      const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 });

      if (!error && users) {
        const user = users.users.find(
          (u) => u.email?.toLowerCase() === email,
        );

        if (user) {
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              abacatepay_paid_at: new Date().toISOString(),
              abacatepay_paid_billing_id: billing.id ?? null,
            },
          });
        }
      }
    }
  } catch (err) {
    // Falha ao atualizar metadata não deve bloquear o ACK do webhook
    console.error("[abacatepay/webhook] Erro ao atualizar metadata:", err);
  }

  // Registrar conversão de afiliado se houver ref_code no metadata
  try {
    const meta = billing.metadata ?? {};
    const refCode = typeof meta.ref_code === "string" ? meta.ref_code.trim().toUpperCase() : null;
    const plan = typeof meta.plan === "string" ? meta.plan : null;

    if (refCode && plan && email) {
      const affiliate = await getAffiliateByCode(refCode);
      if (affiliate && affiliate.status === "active") {
        const planKey = plan as keyof typeof PLAN_PRICING;
        const amountCents =
          typeof billing.amount === "number" && billing.amount > 0
            ? billing.amount
            : (PLAN_PRICING[planKey]?.priceCents ?? 0);
        const commissionCents = Math.round(amountCents * affiliate.commission_rate);

        await createConversion({
          affiliate_id: affiliate.id,
          referred_user_email: email,
          plan,
          amount_cents: amountCents,
          commission_cents: commissionCents,
          billing_id: billing.id ?? null,
        });
      }
    }
  } catch (err) {
    console.error("[abacatepay/webhook] Erro ao registrar conversão de afiliado:", err);
  }

  return NextResponse.json({ ok: true });
}
