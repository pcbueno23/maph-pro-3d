import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "Maph Pro 3D <noreply@seu-dominio.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

export async function sendTrialExpiringEmail(to: string, daysRemaining: number): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurada — e-mail não enviado.");
    return;
  }

  const pricingUrl = `${APP_URL}/pricing`;
  const suporteUrl = `${APP_URL}/suporte`;

  const dayLabel = daysRemaining === 1 ? "1 dia" : `${daysRemaining} dias`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu trial encerra em ${dayLabel}</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid #1e293b;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#f8fafc;letter-spacing:-0.01em;">
                Maph Pro 3D
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
                Precificação e gestão para impressão 3D
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;display:inline-block;background:#f59e0b1a;border:1px solid #f59e0b40;border-radius:99px;padding:4px 12px;font-size:12px;font-weight:600;color:#fde68a;">
                ⏰ Trial encerrando em ${dayLabel}
              </p>

              <h1 style="margin:16px 0 8px;font-size:22px;font-weight:800;color:#f8fafc;line-height:1.3;">
                Seu período gratuito encerra ${daysRemaining === 1 ? "amanhã" : `em ${dayLabel}`}.
              </h1>

              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Continue usando a calculadora de precificação, gestão de insumos, ordens de
                produção e relatórios escolhendo um plano. Seus dados e configurações ficam
                salvos.
              </p>

              <!-- CTA -->
              <a href="${pricingUrl}"
                 style="display:inline-block;background:linear-gradient(90deg,#06b6d4,#10b981);color:#020617;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">
                Ver planos e continuar →
              </a>

              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #1e293b;padding-top:24px;">
                <tr>
                  <td style="padding:0 12px 0 0;vertical-align:top;width:50%;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f8fafc;">Precificação</p>
                    <p style="margin:0;font-size:12px;color:#64748b;">Custo real + taxas por canal com margem líquida.</p>
                  </td>
                  <td style="padding:0 0 0 12px;vertical-align:top;width:50%;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f8fafc;">Gestão completa</p>
                    <p style="margin:0;font-size:12px;color:#64748b;">Insumos, impressoras, ordens e relatórios.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e293b;background:#080f1e;">
              <p style="margin:0;font-size:11px;color:#475569;line-height:1.6;">
                Você está recebendo este e-mail porque criou uma conta no Maph Pro 3D.<br />
                <a href="${suporteUrl}" style="color:#22d3ee;text-decoration:none;">Falar com suporte</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/privacidade" style="color:#22d3ee;text-decoration:none;">Política de Privacidade</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ Seu trial do Maph Pro 3D encerra em ${dayLabel}`,
    html,
  });
}
