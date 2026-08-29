import { useEffect, useState, type FormEvent } from "react";
import { sendToBackground } from "./messaging";

const LAST_EMAIL_KEY = "mp3d_last_email";

/**
 * Lógica do login sem senha (pedir código → confirmar código) — compartilhada
 * entre o popup da extensão e o modal que aparece por cima da página da
 * Shopee, cada um com sua própria apresentação (classes CSS diferentes).
 *
 * O campo de e-mail vem pré-preenchido com o último usado (guardado no
 * `chrome.storage.local`) — o autocomplete nativo do Chrome pra esse campo
 * não é clicável dentro do shadow DOM do modal, então pré-preencher resolve
 * sem depender dele.
 */
export function useOtpAuth(onSignedIn?: () => void) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(LAST_EMAIL_KEY).then((r) => {
      const saved = r[LAST_EMAIL_KEY];
      if (typeof saved === "string" && saved) setEmail(saved);
    });
  }, []);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const result = await sendToBackground({ type: "REQUEST_OTP", email });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    chrome.storage.local.set({ [LAST_EMAIL_KEY]: email }).catch(() => {});
    setStep("code");
    setInfo(`Mandamos um código de acesso pra ${email}. Confira sua caixa de entrada.`);
  }

  async function verifyCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    const result = await sendToBackground({ type: "VERIFY_OTP", email, token: code });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSignedIn?.();
  }

  function reset() {
    // Não limpa o e-mail de propósito — é o "último usado" que queremos
    // manter pré-preenchido (ver useEffect acima); só reseta o resto do
    // fluxo (código, erro, aviso).
    setStep("email");
    setCode("");
    setError(null);
    setInfo(null);
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setError(null);
  }

  return { email, setEmail, code, setCode, step, error, info, busy, requestCode, verifyCode, reset, backToEmail };
}
