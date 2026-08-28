import { useEffect, useState } from "react";
import { sendToBackground } from "../lib/messaging";
import type { AuthState, ShopeeContext } from "../lib/messaging";

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "http://localhost:3000";

export function Popup() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [shopeeCtx, setShopeeCtx] = useState<ShopeeContext | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    sendToBackground({ type: "GET_AUTH_STATE" }).then(setAuth);
  }, []);

  useEffect(() => {
    if (auth.status === "signed_in") {
      sendToBackground({ type: "GET_SHOPEE_CONTEXT" }).then(setShopeeCtx);
    }
  }, [auth.status]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    const result = await sendToBackground({ type: "SIGN_IN", email, password });
    setSigningIn(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAuth(await sendToBackground({ type: "GET_AUTH_STATE" }));
  }

  async function handleSignOut() {
    await sendToBackground({ type: "SIGN_OUT" });
    setAuth({ status: "signed_out" });
    setShopeeCtx(null);
  }

  return (
    <div className="pop">
      <div className="pop-brand">Maph Pro 3D</div>
      <div className="pop-sub">Inteligência de mercado direto na Shopee</div>

      {auth.status === "loading" && <p className="pop-muted">Carregando...</p>}

      {auth.status === "signed_out" && (
        <form onSubmit={handleSignIn}>
          {error && <div className="pop-error">{error}</div>}
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
          <div className="pop-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </div>
          <button className="pop-btn" type="submit" disabled={signingIn}>
            {signingIn ? "Entrando..." : "Entrar"}
          </button>
          <div className="pop-links">
            <a href={`${APP_URL}/login`} target="_blank" rel="noreferrer">
              Esqueci minha senha
            </a>
            <a href={`${APP_URL}/login`} target="_blank" rel="noreferrer">
              Ainda não tenho conta
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
