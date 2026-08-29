import { useEffect, useState } from "react";
import { sendToBackground } from "../lib/messaging";
import type { AuthState, ShopeeContext } from "../lib/messaging";
import { APP_URL } from "../lib/appUrl";
import { useOtpAuth } from "../lib/useOtpAuth";

export function Popup() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [shopeeCtx, setShopeeCtx] = useState<ShopeeContext | null>(null);
  const otp = useOtpAuth(() => {
    sendToBackground({ type: "GET_AUTH_STATE" }).then(setAuth);
  });
  const { email, setEmail, code, setCode, step, error, info, busy, requestCode, verifyCode, backToEmail } = otp;

  useEffect(() => {
    sendToBackground({ type: "GET_AUTH_STATE" }).then(setAuth);
  }, []);

  useEffect(() => {
    if (auth.status === "signed_in") {
      sendToBackground({ type: "GET_SHOPEE_CONTEXT" }).then(setShopeeCtx);
    }
  }, [auth.status]);

  async function handleSignOut() {
    await sendToBackground({ type: "SIGN_OUT" });
    setAuth({ status: "signed_out" });
    setShopeeCtx(null);
    otp.reset();
  }

  return (
    <div className="pop">
      <div className="pop-brand">Maph Pro 3D</div>
      <div className="pop-sub">Inteligência de mercado direto na Shopee</div>

      {auth.status === "loading" && <p className="pop-muted">Carregando...</p>}

      {auth.status === "signed_out" && step === "email" && (
        <form onSubmit={requestCode}>
          {error && <div className="pop-error">{error}</div>}
          <p className="pop-muted" style={{ marginTop: 0 }}>
            Sem senha — mandamos um código pro e-mail já cadastrado no Maph Pro 3D.
          </p>
          <div className="pop-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              autoFocus
            />
          </div>
          <button className="pop-btn" type="submit" disabled={busy}>
            {busy ? "Enviando..." : "Enviar código"}
          </button>
          <div className="pop-links">
            <a href={`${APP_URL}/login`} target="_blank" rel="noreferrer">
              Ainda não tenho conta
            </a>
          </div>
        </form>
      )}

      {auth.status === "signed_out" && step === "code" && (
        <form onSubmit={verifyCode}>
          {error && <div className="pop-error">{error}</div>}
          {info && <p className="pop-muted" style={{ marginTop: 0 }}>{info}</p>}
          <div className="pop-field">
            <label htmlFor="code">Código de acesso</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              required
              value={code}
              onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          <button className="pop-btn" type="submit" disabled={busy || code.length < 6}>
            {busy ? "Confirmando..." : "Confirmar"}
          </button>
          <div className="pop-links">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                backToEmail();
              }}
            >
              Usar outro e-mail
            </a>
          </div>
        </form>
      )}

      {auth.status === "signed_in" && (
        <div>
          <div className="pop-row">
            <span className="pop-muted">Conta</span>
            <strong>{auth.email}</strong>
          </div>
          <div className="pop-row">
            <span className="pop-muted">Preset Shopee</span>
            {shopeeCtx?.status === "ok" && <span className="pop-badge ok">{shopeeCtx.preset.name}</span>}
            {shopeeCtx?.status === "no_preset" && <span className="pop-badge warn">não configurado</span>}
            {shopeeCtx == null && <span className="pop-muted">verificando...</span>}
          </div>

          {shopeeCtx?.status === "no_preset" && (
            <p className="pop-muted" style={{ marginTop: 8 }}>
              Sem um preset ativo da Shopee, a simulação de preço no anúncio não aparece. Configure
              em Calculadora Shopee → Salvar preset.
            </p>
          )}

          <div className="pop-links">
            <a href={`${APP_URL}/calculadoras/shopee`} target="_blank" rel="noreferrer">
              Abrir calculadora Shopee
            </a>
            <a href={`${APP_URL}/products`} target="_blank" rel="noreferrer">
              Abrir meus produtos
            </a>
          </div>

          <button className="pop-btn ghost" onClick={handleSignOut} style={{ marginTop: 12 }}>
            Sair
          </button>
        </div>
      )}

      <p className="pop-muted" style={{ marginTop: 14, fontSize: 11 }}>
        Navegue até um anúncio ou uma busca na Shopee pra ver a simulação de margem e os produtos
        campeões.
      </p>
    </div>
  );
}
