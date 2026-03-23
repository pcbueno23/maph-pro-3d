/**
 * Mensagens de autenticação para a UI — linguagem simples, sem jargão de infra.
 */

export type AuthErrorContext = "signin" | "signup" | "forgot" | "oauth";

function isRateLimited(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  const combined = `${code} ${msg}`.toLowerCase();
  return (
    code === "over_email_send_rate_limit" ||
    combined.includes("rate limit") ||
    combined.includes("email rate limit") ||
    combined.includes("too many requests")
  );
}

/** Erros de login, cadastro, recuperação e OAuth. */
export function userFacingAuthError(
  err: unknown,
  context: AuthErrorContext = "signin",
): string {
  if (isRateLimited(err)) {
    if (context === "forgot") {
      return "Muitos pedidos de recuperação em pouco tempo. Aguarde cerca de uma hora e tente de novo, ou use outra rede (Wi‑Fi). Se for urgente, fale com o suporte.";
    }
    if (context === "signup") {
      return "Muitos e-mails enviados em pouco tempo. Aguarde cerca de uma hora e tente novamente.";
    }
    return "No momento não é possível enviar mais e-mails. Aguarde um pouco e tente de novo.";
  }

  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code).toLowerCase()
      : "";
  const low = `${code} ${msg}`.toLowerCase();

  if (
    code === "invalid_credentials" ||
    low.includes("invalid login credentials") ||
    low.includes("invalid email or password")
  ) {
    return "E-mail ou senha incorretos.";
  }
  if (
    code === "email_not_confirmed" ||
    low.includes("email not confirmed")
  ) {
    return "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada e o spam.";
  }
  if (code === "user_already_exists" || low.includes("already registered")) {
    return "Já existe uma conta com este e-mail. Tente entrar ou use Esqueci minha senha.";
  }
  if (low.includes("signup") && low.includes("disabled")) {
    return "Novos cadastros estão indisponíveis no momento. Tente mais tarde ou fale com o suporte.";
  }

  return "Não foi possível concluir. Tente de novo em alguns minutos.";
}

/** Erros ao salvar nova senha (updateUser). */
export function userFacingPasswordUpdateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code).toLowerCase()
      : "";
  const low = `${code} ${msg}`.toLowerCase();

  if (
    low.includes("session") &&
    (low.includes("expired") || low.includes("invalid"))
  ) {
    return "Este link expirou ou não é mais válido. Peça um novo e-mail em Esqueci minha senha no login.";
  }
  if (code === "weak_password" || low.includes("weak password")) {
    return "Escolha uma senha mais forte (mais longa ou com letras e números).";
  }
  if (low.includes("same_password")) {
    return "A nova senha deve ser diferente da anterior.";
  }

  return "Não foi possível salvar a senha. Tente de novo em alguns minutos.";
}
