import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchSearchItems, type EnrichedCard, type SearchDebugInfo } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { computePageStats, groupBySeller, pickChampions, matchesFilter, type FilterKey } from "./aggregate";
import {
  upsertMiniCard,
  pruneMiniCards,
  repositionAllMiniCards,
  setCardVisible,
  clearAllMiniCards,
  initMiniCardTheme,
} from "./miniCard";
import { onDiagnostic, type Diagnostic } from "../../lib/shopeeCapture";
import { sendToBackground } from "../../lib/messaging";
import { onAuthChange, isAdminEmail } from "../../lib/authGate";
import { getTheme, onThemeChange } from "../../lib/theme";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-search-panel";
const POS_KEY = "mp3d_search_panel_pos";
const DEFAULT_POS = { top: 16, left: 16 };
const DRAG_MARGIN = 48; // sempre deixa pelo menos essa faixa do painel visível/agarrável na tela

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

/**
 * Mostra/esconde os cards REAIS da Shopee de acordo com o filtro ativo (só
 * cria mini-card pros que ficam visíveis) e devolve a contagem de campeões
 * pro painel.
 */
function paintMiniCards(cards: EnrichedCard[], filter: FilterKey | null, locked: boolean) {
  const champions = pickChampions(cards);
  const activeEls = new Set<HTMLElement>();

  for (const c of cards) {
    if (!c.el) continue;
    const visible = filter == null || matchesFilter(c, filter, champions);
    setCardVisible(c.el, visible);
    if (!visible) continue;
    activeEls.add(c.el);
    upsertMiniCard(c, champions.has(c.el), locked);
  }

  pruneMiniCards(activeEls);
  return champions.size;
}

/** Monta o painel + os mini-cards da busca. Devolve uma função de limpeza (usada quando a Shopee navega pra outro tipo de página via SPA, sem recarregar). */
export function mountSearchPanel(): () => void {
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
  const stopMiniCardTheme = initMiniCardTheme();

  loadPanelPos().then((pos) => {
    host.style.top = `${pos.top}px`;
    host.style.left = `${pos.left}px`;
  });

  /**
   * Arrasta pela barra do topo (onde tem "Maph Pro 3D") — a Shopee é
   * imprevisível demais pra confiar 100% numa posição "adivinhada"
   * automaticamente (às vezes cobre o cabeçalho, às vezes não empurra o
   * conteúdo de baixo), então o usuário escolhe onde deixar e a extensão
   * lembra da próxima vez. Delegação de evento no shadow root inteiro (em
   * vez de grudar no elemento da barra) pra continuar funcionando mesmo
   * quando o React re-renderiza e troca o nó do DOM.
   */
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

  let latestCards: EnrichedCard[] = [];
  let latestDiagnostic: Diagnostic | null = null;
  let latestSearchDebug: SearchDebugInfo | null = null;
  let activeFilter: FilterKey | null = null;
  let received = false;
  let stopped = false;
  let signedIn = false;
  let isAdmin = false;

  const render = (loading: boolean) => {
    if (stopped) return;
    const championCount = paintMiniCards(latestCards, activeFilter, !signedIn);
    // Reposiciona de novo logo em seguida: esconder/mostrar cards muda a
    // altura da página, então as posições lidas durante paintMiniCards já
    // podem estar levemente desatualizadas pros cards processados depois.
    window.setTimeout(() => {
      if (!stopped) repositionAllMiniCards();
    }, 60);

    const stats = computePageStats(latestCards);
    const sellers = groupBySeller(latestCards);
    const titles = latestCards.map((c) => c.name).filter((t): t is string => !!t);
    const keywords = extractKeywords(titles);

    root.render(
      <Panel
        loading={loading}
        championCount={championCount}
        stats={stats}
        sellers={sellers}
        keywords={keywords}
        diagnostic={latestDiagnostic}
        searchDebug={latestSearchDebug}
        activeFilter={activeFilter}
        onFilterChange={(next) => {
          activeFilter = activeFilter === next ? null : next;
          render(false);
        }}
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
  // O login acontece no modal (ou no popup da extensão) — reage sozinho quando a
  // sessão muda, sem precisar recarregar a página da Shopee.
  const stopAuthWatch = onAuthChange(refreshAuth);

  render(true);

  // Coordenadas dos mini-cards são absolutas na página (não fixas), então
  // rolar a tela não precisa de reposicionamento — só resize e o próprio
  // carregamento preguiçoso das imagens da Shopee, que muda a altura dos
  // cards depois.
  window.addEventListener("resize", repositionAllMiniCards);
  const warmupTimers = [500, 1200, 2500, 4000].map((delay) =>
    window.setTimeout(() => {
      if (!stopped) repositionAllMiniCards();
    }, delay),
  );

  const stopDiagnostic = onDiagnostic((d) => {
    latestDiagnostic = d;
    render(!received);
  });

  const stopWatch = watchSearchItems(
    (cards) => {
      received = true;
      latestCards = cards;
      render(false);
    },
    (debug) => {
      latestSearchDebug = debug;
      render(!received);
    },
  );

  return () => {
    stopped = true;
    stopWatch();
    stopDiagnostic();
    stopAuthWatch();
    stopThemeWatch();
    stopMiniCardTheme();
    window.removeEventListener("resize", repositionAllMiniCards);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    warmupTimers.forEach((t) => window.clearTimeout(t));
    clearAllMiniCards();
    root.unmount();
    host.remove();
  };
}
