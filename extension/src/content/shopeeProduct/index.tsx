import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";
import { scrapeListing, findInsertionAnchor, type ScrapedListing } from "./scrape";
import { CARD_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-product-overlay";

/** Monta o card do anúncio — logo abaixo do título, no fluxo normal da página, se achar onde encaixar; senão cai pro card flutuante no canto. Devolve uma função de limpeza (usada quando a Shopee navega pra outro tipo de página via SPA, sem recarregar). */
export function mountProductOverlay(): () => void {
  if (document.getElementById(HOST_ID)) return () => {};

  let listing: ScrapedListing = scrapeListing();
  const anchor = findInsertionAnchor(listing.title);
  const inline = anchor != null;

  const host = document.createElement("div");
  host.id = HOST_ID;
  if (anchor) anchor.insertAdjacentElement("afterend", host);
  else document.body.appendChild(host);

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
    root.unmount();
    host.remove();
  };
}
