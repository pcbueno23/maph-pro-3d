import { useEffect, useState } from "react";
import { sendToBackground } from "../lib/messaging";
import type { AuthState } from "../lib/messaging";
import { useOtpAuth } from "../lib/useOtpAuth";
import { OPEN_LOGIN_EVENT } from "../lib/authGate";
import { APP_URL } from "../lib/appUrl";
import { MAPH_LOGO_DATA_URI } from "./logo";

/**
 * Login sem senha, mas como um modal flutuando POR CIMA da própria página da
 * Shopee — não abre aba nova. Fica montado uma única vez (ver router.tsx) e
 * escondido até algum "Fazer login" disparar o evento `OPEN_LOGIN_EVENT`.
 */
export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const otp = useOtpAuth(() => {
    setOpen(false);
    otp.reset();
  });

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_LOGIN_EVENT, handler);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (open) sendToBackground({ type: "GET_AUTH_STATE" }).then(setAuth);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="mp3d-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="mp3d-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="mp3d-card-head">
          <span className="mp3d-brand-row">
            <img className="mp3d-brand-logo" src={MAPH_LOGO_DATA_URI} alt="" />
            <span className="mp3d-brand">Maph Pro 3D</span>
          </span>
          <button className="mp3d-close" onClick={() => setOpen(false)} aria-label="Fechar">
            ×
          </button>
        </div>

        {auth?.status === "signed_in" ? (
          <p className="mp3d-muted">Você já está logado como {auth.email}.</p>
        ) : otp.step === "email" ? (
          <form onSubmit={otp.requestCode}>
            {otp.error && <p className="mp3d-muted mp3d-warn">{otp.error}</p>}
            <p className="mp3d-muted" style={{ marginTop: 0 }}>
              Sem senha — mandamos um código pro e-mail já cadastrado no Maph Pro 3D.
            </p>
            <label className="mp3d-label">
              E-mail
              <input
                type="email"
                required
                autoFocus
                className="mp3d-input"
                value={otp.email}
                onChange={(e) => otp.setEmail(e.currentTarget.value)}
              />
            </label>
            <button className="mp3d-btn" type="submit" disabled={otp.busy} style={{ marginTop: 10 }}>
              {otp.busy ? "Enviando..." : "Enviar código"}
            </button>
            <p className="mp3d-muted" style={{ marginTop: 10, fontSize: 11 }}>
              Ainda não tem conta?{" "}
              <a href={`${APP_URL}/login`} target="_blank" rel="noreferrer">
                Crie uma no Maph Pro 3D
              </a>
              .
            </p>
          </form>
        ) : (
          <form onSubmit={otp.verifyCode}>
            {otp.error && <p className="mp3d-muted mp3d-warn">{otp.error}</p>}
            {otp.info && (
              <p className="mp3d-muted" style={{ marginTop: 0 }}>
                {otp.info}
              </p>
            )}
            <label className="mp3d-label">
              Código de acesso
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                required
                autoFocus
                className="mp3d-input"
                value={otp.code}
                onChange={(e) => otp.setCode(e.currentTarget.value.replace(/\D/g, ""))}
              />
            </label>
            <button
              className="mp3d-btn"
              type="submit"
              disabled={otp.busy || otp.code.length < 6}
              style={{ marginTop: 10 }}
            >
              {otp.busy ? "Confirmando..." : "Confirmar"}
            </button>
            <button type="button" className="mp3d-filter-clear" style={{ marginTop: 10 }} onClick={otp.backToEmail}>
              Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
