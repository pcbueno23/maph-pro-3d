# E-mails Supabase — MAPH PRO 3D

Templates no **padrão visual do SaaS** (fundo escuro, detalhes em ciano/verde) para colar no Supabase.

**Onde usar:** Dashboard → **Authentication** → **Email** → **Templates** → escolha o tipo → cole o **Subject** e o **Body**.

**SMTP:** Para produção, configure a aba **SMTP Settings** (o aviso laranja no painel). Sem SMTP próprio, continua saindo pelo serviço interno do Supabase.

---

## Variáveis do Supabase (Go templates)

| Variável | Uso |
|----------|-----|
| `{{ .ConfirmationURL }}` | Link completo de confirmação (confirm signup, change email) |
| `{{ .SiteURL }}` | Site URL do projeto |
| `{{ .Email }}` | E-mail do usuário |
| `{{ .Token }}` | Token (se precisar montar URL manual — prefira `ConfirmationURL`) |

Se alguma variável não funcionar na sua versão do painel, consulte a ajuda ao lado do editor de template no Supabase.

---

## 1. Confirm sign up — Assunto

```
Confirme seu cadastro — MAPH PRO 3D
```

---

## 2. Confirm sign up — Corpo (HTML)

Cole no template **Confirm sign up**:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirmar cadastro</title>
</head>
<body style="margin:0;padding:0;background-color:#020617;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 24px 8px 24px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#06b6d4,#10b981);margin-bottom:16px;"></div>
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#f8fafc;letter-spacing:-0.02em;">MAPH PRO 3D</h1>
              <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;">Precificação & gestão 3D</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px 24px;">
              <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#e2e8f0;">Confirme seu e-mail</p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Você criou uma conta conosco. Clique no botão abaixo para ativar o acesso. Se não foi você, pode ignorar este e-mail.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(90deg,#06b6d4,#10b981);">
                    <a href="{{ .ConfirmationURL }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#020617;text-decoration:none;border-radius:12px;">
                      Confirmar meu e-mail
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">
                Ou copie e cole no navegador:<br />
                <a href="{{ .ConfirmationURL }}" style="color:#22d3ee;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px 24px;border-top:1px solid #1e293b;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#475569;text-align:center;">
                Este e-mail foi enviado para <strong style="color:#94a3b8;">{{ .Email }}</strong><br />
                Cadastro em {{ .SiteURL }}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset password — Assunto

```
Redefinir senha — MAPH PRO 3D
```

Use o template **Reset password** e o mesmo estilo trocando o texto e mantendo `{{ .ConfirmationURL }}` (no reset o Supabase costuma usar a mesma variável para o link — confira no painel a documentação do template).

**Corpo (trecho principal):** troque o título e o parágrafo por:

- Título: **Nova senha**
- Texto: *Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo. Se você não pediu, ignore este e-mail.*
- Botão: **Criar nova senha** → `href="{{ .ConfirmationURL }}"`

---

## 4. Magic link — Assunto

```
Seu link de acesso — MAPH PRO 3D
```

Mesma estrutura HTML; botão: **Entrar agora** com `{{ .ConfirmationURL }}`.

---

## Dicas

1. Após colar, envie um teste com um e-mail real.
2. Com **SMTP customizado**, configure remetente tipo `MAPH PRO 3D <noreply@seudominio.com>` no provedor (Resend, SendGrid, etc.).
3. **Site URL** em Authentication → URL Configuration deve ser `https://app.maphpro3d.com` para links corretos.
