import { sendToBackground } from "./messaging";

/** Único e-mail com acesso ao painel de diagnóstico (dados brutos capturados, status do interceptor) — é ferramenta de depuração interna, não algo pra mostrar a clientes. */
const ADMIN_EMAIL = "pcbueno23@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/**
 * true = logado numa conta do Maph Pro 3D, false = não. O login acontece
 * numa aba separada (popup), então quem já está com o Raio-X aberto na
 * Shopee só sabe que o usuário logou reagindo a `chrome.storage.onChanged`
 * (é lá que o Supabase guarda a sessão) — sem isso o usuário precisaria dar
 * F5 na aba da Shopee depois de logar.
 */
export async function isSignedIn(): Promise<boolean> {
  const auth = await sendToBackground({ type: "GET_AUTH_STATE" });
  return auth.status === "signed_in";
}

export function onAuthChange(cb: () => void): () => void {
  let timer: number | undefined;
  const handler = () => {
    // Debounce: o login troca várias chaves de storage de uma vez.
    window.clearTimeout(timer);
    timer = window.setTimeout(cb, 200);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => {
    window.clearTimeout(timer);
    chrome.storage.onChanged.removeListener(handler);
  };
}
