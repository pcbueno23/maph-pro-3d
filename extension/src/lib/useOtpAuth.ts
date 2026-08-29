import { useState, type FormEvent } from "react";
import { sendToBackground } from "./messaging";

/**
 * Lógica do login sem senha (pedir código → confirmar código) — compartilhada
 * entre o popup da extensão e o modal que aparece por cima da página da
 * Shopee, cada um com sua própria apresentação (classes CSS diferentes).
 */
export function useOtpAuth(onSignedIn?: () => void) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setStep("email");
    setEmail("");
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
