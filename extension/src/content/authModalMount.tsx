import { createRoot } from "react-dom/client";
import { AuthModal } from "./AuthModal";
import { CARD_STYLES } from "./styles";
import { getTheme, onThemeChange } from "../lib/theme";

const HOST_ID = "mp3d-auth-modal-host";

/** Monta o modal de login uma única vez, independente da página ser um anúncio ou uma busca — fica escondido até ser aberto (ver OPEN_LOGIN_EVENT em AuthModal.tsx). */
export function mountAuthModal(): () => void {
  if (document.getElementById(HOST_ID)) return () => {};

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);
  getTheme().then((t) => host.setAttribute("data-theme", t));
  const stopThemeWatch = onThemeChange((t) => host.setAttribute("data-theme", t));

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CARD_STYLES;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  root.render(<AuthModal />);

  return () => {
    stopThemeWatch();
    root.unmount();
    host.remove();
  };
}
