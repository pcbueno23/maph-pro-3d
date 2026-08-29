import { sendToBackground } from "./messaging";

/** Único e-mail com acesso ao painel de diagnóstico (dados brutos capturados, status do interceptor) — é ferramenta de depuração interna, não algo pra mostrar a clientes. */
const ADMIN_EMAIL = "pcbueno23@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/** Nome do evento que qualquer botão "Fazer login" (React ou DOM puro) dispara pra abrir o modal de login (ver content/AuthModal.tsx) — fica aqui, não lá, pra não obrigar código sem JSX (ex.: miniCard.ts) a importar de um módulo .tsx. */
export const OPEN_LOGIN_EVENT = "mp3d:open-login";

/**
 * true = logado numa conta do Maph Pro 3D, false = não. Como o login agora
 * é um modal dentro da própria página (não uma aba separada), o normal é a
 * sessão já estar pronta assim que a extensão captura o código — mas
 * `onAuthChange` continua útil pra outros casos (ex.: logout numa aba,
 * sessão expirando) reagirem sozinhos, sem precisar de F5.
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
