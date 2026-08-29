import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";
import { scrapeListing, findInsertionAnchor, type ScrapedListing } from "./scrape";
import { CARD_STYLES } from "../styles";

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
  const anchor = findInsertionAnchor(listing.title);
  const inline = anchor != null;

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.pointerEvents = "auto";

  let originalMargin = "";
  let repositionTimers: number[] = [];
  let resizeObserver: ResizeObserver | null = null;

  const reposition = () => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    host.style.position = "absolute";
    host.style.top = `${rect.bottom + window.scrollY + GAP}px`;
    host.style.left = `${rect.left + window.scrollX}px`;
    host.style.width = `${Math.min(rect.width || MAX_INLINE_WIDTH, MAX_INLINE_WIDTH)}px`;
  };

  const applySpacing = () => {
    if (!anchor) return;
    anchor.style.marginBottom = `${host.offsetHeight + GAP}px`;
  };

  if (anchor) {
    originalMargin = anchor.style.marginBottom || "";
    getLayer().appendChild(host);
    reposition();
    resizeObserver = new ResizeObserver(() => {
      reposition();
      applySpacing();
    });
    resizeObserver.observe(host);
    window.addEventListener("resize", reposition);
    // O layout ao redor do título pode continuar mudando um pouco depois do
    // load (imagens/preço/cupons carregando) — reforça a posição por um
    // tempo, sem depender só do resize da janela.
    repositionTimers = [300, 800, 1500, 3000, 6000].map((delay) => window.setTimeout(reposition, delay));
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
    repositionTimers.forEach((t) => window.clearTimeout(t));
    resizeObserver?.disconnect();
    window.removeEventListener("resize", reposition);
    if (anchor) anchor.style.marginBottom = originalMargin;
    root.unmount();
    host.remove();
  };
}
