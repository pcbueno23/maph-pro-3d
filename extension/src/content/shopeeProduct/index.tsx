import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";
import { scrapeListing, findInsertionAnchor, type ScrapedListing } from "./scrape";
import { CARD_STYLES } from "../styles";
import { getTheme, onThemeChange } from "../../lib/theme";

const HOST_ID = "mp3d-shopee-product-overlay";
const LAYER_ID = "mp3d-product-layer";
const MAX_INLINE_WIDTH = 480;
const GAP = 10;

/**
 * Camada separada da árvore da Shopee, só pra hospedar o card quando ele
 * fica "abaixo do título" — inserir o card como filho de verdade dentro do
 * container do anúncio (como uma 1ª tentativa fez) parecia funcionar, mas a
 * Shopee re-renderiza aquele container com o React dela, e o React remove
 * qualquer nó que não reconhece como seu — por isso o card "piscava e
 * sumia". Aqui, igual ao mini-card da busca, o card vive fora da árvore
 * deles e só é POSICIONADO por cima do lugar certo via coordenadas.
 */
function getLayer(): HTMLElement {
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement("div");
    layer.id = LAYER_ID;
    layer.style.cssText =
      "position:absolute; top:0; left:0; width:0; height:0; pointer-events:none; z-index:2147483000;";
    document.body.appendChild(layer);
  }
  return layer;
}

/** Monta o card do anúncio — logo abaixo do título quando acha onde encaixar; senão cai pro card flutuante no canto. Devolve uma função de limpeza (usada quando a Shopee navega pra outro tipo de página via SPA, sem recarregar). */
export function mountProductOverlay(): () => void {
  if (document.getElementById(HOST_ID)) return () => {};

  let listing: ScrapedListing = scrapeListing();
  let anchor = findInsertionAnchor(listing.title);
  const inline = anchor != null;

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.pointerEvents = "auto";
  getTheme().then((t) => host.setAttribute("data-theme", t));
  const stopThemeWatch = onThemeChange((t) => host.setAttribute("data-theme", t));

  let originalMargin = "";
  let pollTimer: number | undefined;
  let resizeObserver: ResizeObserver | null = null;

  /**
   * A Shopee re-renderiza o container do título depois do load inicial (ex.:
   * quando o banner de "Oferta Relâmpago" ou o preço chegam via JS) — isso
   * troca o nó do DOM que a gente guardou, deixando a referência antiga
   * "órfã" (sem pai), cujo getBoundingClientRect() sempre devolve (0,0). Se
   * isso acontecer, procura o título de novo em vez de grudar o card no
   * canto da página pra sempre.
   */
  const reposition = () => {
    if (!anchor) return;
    if (!document.body.contains(anchor)) {
      anchor = findInsertionAnchor(listing.title);
      if (!anchor) {
        host.style.display = "none";
        return;
      }
      originalMargin = anchor.style.marginBottom || "";
    }
    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // ainda sem layout — tenta de novo no próximo tick
    host.style.display = "";
    host.style.position = "absolute";
    host.style.top = `${rect.bottom + window.scrollY + GAP}px`;
    host.style.left = `${rect.left + window.scrollX}px`;
    host.style.width = `${Math.min(rect.width || MAX_INLINE_WIDTH, MAX_INLINE_WIDTH)}px`;
  };

  const applySpacing = () => {
    if (!anchor || !document.body.contains(anchor)) return;
    anchor.style.marginBottom = `${host.offsetHeight + GAP}px`;
  };

  if (anchor) {
    originalMargin = anchor.style.marginBottom || "";
    host.style.display = "none"; // some por trás até a 1ª posição válida — evita piscar no canto (0,0)
    getLayer().appendChild(host);
    reposition();
    resizeObserver = new ResizeObserver(() => {
      reposition();
      applySpacing();
    });
    resizeObserver.observe(host);
    window.addEventListener("resize", reposition);
    // O layout ao redor do título pode continuar mudando por um tempo depois
    // do load (hidratação da Shopee, banners assíncronos, preço/cupom
    // chegando) — reforça a posição nesse período em vez de depender só do
    // resize da janela.
    let ticks = 0;
    pollTimer = window.setInterval(() => {
      reposition();
      applySpacing();
      ticks += 1;
      if (ticks >= 20) window.clearInterval(pollTimer); // ~14s, tempo de sobra pra hidratação assentar
    }, 700);
  } else {
    document.body.appendChild(host);
  }

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CARD_STYLES;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  root.render(<Overlay listing={listing} inline={inline} />);

  // A Shopee é uma SPA e o preço costuma renderizar um pouco depois do load —
  // reescaneia por alguns segundos até achar um preço, sem ficar pra sempre
  // reprocessando a página.
  let attempts = 0;
  const poll = window.setInterval(() => {
    attempts += 1;
    const next = scrapeListing();
    if (next.price != null || attempts > 8) {
      if (next.price !== listing.price || next.soldCount !== listing.soldCount) {
        listing = next;
        root.render(<Overlay listing={listing} inline={inline} />);
      }
      window.clearInterval(poll);
    }
  }, 1000);

  return () => {
    window.clearInterval(poll);
    window.clearInterval(pollTimer);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", reposition);
    stopThemeWatch();
    if (anchor && document.body.contains(anchor)) anchor.style.marginBottom = originalMargin;
    root.unmount();
    host.remove();
  };
}
