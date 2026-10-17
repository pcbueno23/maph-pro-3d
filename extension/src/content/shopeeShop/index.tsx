import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchShopItems, type ShopItem, type ShopDebugInfo } from "./scrape";
import { computeShopStats } from "./aggregate";
import { onDiagnostic, type Diagnostic } from "../../lib/shopeeCapture";
import { sendToBackground } from "../../lib/messaging";
import { onAuthChange, isAdminEmail } from "../../lib/authGate";
import { getTheme, onThemeChange } from "../../lib/theme";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-shop-panel";
const POS_KEY = "mp3d_shop_panel_pos";
const DEFAULT_POS = { top: 16, left: 16 };
const DRAG_MARGIN = 48;

type Pos = { top: number; left: number };

async function loadPanelPos(): Promise<Pos> {
  try {
    const r = await chrome.storage.local.get(POS_KEY);
    const pos = r[POS_KEY];
    if (pos && typeof pos.top === "number" && typeof pos.left === "number") return pos;
  } catch {
    /* ignora — usa a posição padrão */
  }
  return DEFAULT_POS;
}

function savePanelPos(pos: Pos) {
  chrome.storage.local.set({ [POS_KEY]: pos }).catch(() => {});
}

/** Monta o painel de Raio-X da loja. Devolve uma função de limpeza (chamada quando a
 * Shopee navega pra outro tipo de página via SPA, sem recarregar). */
export function mountShopPanel(): () => void {
  if (document.getElementById(HOST_ID)) return () => {};

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.zIndex = "2147483000";
  host.style.top = `${DEFAULT_POS.top}px`;
  host.style.left = `${DEFAULT_POS.left}px`;
  document.body.appendChild(host);

  getTheme().then((t) => host.setAttribute("data-theme", t));
  const stopThemeWatch = onThemeChange((t) => host.setAttribute("data-theme", t));

  loadPanelPos().then((pos) => {
    host.style.top = `${pos.top}px`;
    host.style.left = `${pos.left}px`;
  });

  // Mesmo mecanismo de arrastar pela barra do topo usado no painel de busca (ver
  // shopeeSearch/index.tsx pro comentário completo sobre o porquê de ser manual).
  let dragState: { startX: number; startY: number; startTop: number; startLeft: number } | null = null;

  const clampPos = (pos: Pos): Pos => {
    const maxLeft = Math.max(0, window.innerWidth - DRAG_MARGIN);
    const maxTop = Math.max(0, window.innerHeight - DRAG_MARGIN);
    return {
      top: Math.min(Math.max(0, pos.top), maxTop),
      left: Math.min(Math.max(-(host.offsetWidth - DRAG_MARGIN), pos.left), maxLeft),
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragState) return;
    const next = clampPos({
      top: dragState.startTop + (e.clientY - dragState.startY),
      left: dragState.startLeft + (e.clientX - dragState.startX),
    });
    host.style.top = `${next.top}px`;
    host.style.left = `${next.left}px`;
  };

  const onPointerUp = () => {
    if (!dragState) return;
    dragState = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const rect = host.getBoundingClientRect();
    savePanelPos({ top: rect.top, left: rect.left });
  };

  const onPointerDown = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".mp3d-panel-head")) return;
    if (target.closest(".mp3d-close") || target.closest(".mp3d-theme-toggle")) return;
    const pe = e as PointerEvent;
    const rect = host.getBoundingClientRect();
    dragState = { startX: pe.clientX, startY: pe.clientY, startTop: rect.top, startLeft: rect.left };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    e.preventDefault();
  };

  const shadow = host.attachShadow({ mode: "open" });
  shadow.addEventListener("pointerdown", onPointerDown);
  const style = document.createElement("style");
  style.textContent = BADGE_STYLES;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  const root: Root = createRoot(mountPoint);

  let latestItems: ShopItem[] = [];
  let latestTotal: number | null = null;
  let latestDiagnostic: Diagnostic | null = null;
  let latestShopDebug: ShopDebugInfo | null = null;
  let received = false;
  let stopped = false;
  let signedIn = false;
  let isAdmin = false;

  const render = (loading: boolean) => {
    if (stopped) return;
    const stats = computeShopStats(latestItems, latestTotal);
    root.render(
      <Panel
        loading={loading}
        stats={stats}
        diagnostic={latestDiagnostic}
        shopDebug={latestShopDebug}
        onRescan={() => window.location.reload()}
        signedIn={signedIn}
        isAdmin={isAdmin}
      />,
    );
  };

  const refreshAuth = async () => {
    const auth = await sendToBackground({ type: "GET_AUTH_STATE" });
    signedIn = auth.status === "signed_in";
    isAdmin = auth.status === "signed_in" && isAdminEmail(auth.email);
    render(!received);
  };
  refreshAuth();
  const stopAuthWatch = onAuthChange(refreshAuth);

  render(true);

  const stopDiagnostic = onDiagnostic((d) => {
    latestDiagnostic = d;
    render(!received);
  });

  const stopWatch = watchShopItems(
    (items) => {
      received = true;
      latestItems = items;
      render(false);
    },
    (debug) => {
      latestShopDebug = debug;
      latestTotal = debug.totalNaLoja;
      render(!received);
    },
  );

  return () => {
    stopped = true;
    stopWatch();
    stopDiagnostic();
    stopAuthWatch();
    stopThemeWatch();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    root.unmount();
    host.remove();
  };
}
