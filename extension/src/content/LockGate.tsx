import type { ReactNode } from "react";
import { OPEN_LOGIN_EVENT } from "../lib/authGate";

/**
 * Borra o conteúdo real (dado que vem da captura da Shopee — vendidos,
 * faturamento, campeões, idade do anúncio...) até o usuário logar numa
 * conta do Maph Pro 3D. Preço/título/etc. que já estão visíveis na própria
 * página da Shopee continuam fora do cadeado — só o valor competitivo que a
 * extensão agrega é que fica trancado.
 */
export function LockGate({
  locked,
  label = "Faça login no Maph Pro 3D pra ver estes dados",
  children,
}: {
  locked: boolean;
  label?: string;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="mp3d-lock-wrap">
      <div className="mp3d-locked" aria-hidden="true">
        {children}
      </div>
      <div className="mp3d-lock-overlay">
        <span className="mp3d-lock-icon">🔒</span>
        <span className="mp3d-lock-text">{label}</span>
        <button
          type="button"
          className="mp3d-lock-btn"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT))}
        >
          Fazer login
        </button>
      </div>
    </div>
  );
}
