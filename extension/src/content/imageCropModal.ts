/**
 * Modal de recorte pra busca por imagem no MakerWorld.
 *
 * Não consegui confirmar um jeito de abrir o MakerWorld já buscando pela
 * imagem automaticamente — o site bloqueia acesso automatizado (mesma
 * proteção que vimos com a Shopee nessa sessão), então não dá pra saber se
 * eles aceitam um link direto tipo o Google Lens (`uploadbyurl`). O fluxo
 * aqui é o melhor possível sem essa confirmação: recorta → baixa o arquivo
 * + copia pra área de transferência (quando o navegador deixar) → abre o
 * MakerWorld numa aba nova, pronto pra colar (Ctrl+V) ou enviar o arquivo
 * baixado no campo de busca por imagem deles.
 */
import { CARD_STYLES } from "./styles";
import { getTheme, onThemeChange } from "../lib/theme";
import { MAPH_LOGO_DATA_URI } from "./logo";

const HOST_ID = "mp3d-crop-modal-host";
const MAKERWORLD_SEARCH_URL = "https://makerworld.com/en/search/models";

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recorte"
  );
}

const CROP_STYLES = `
.mp3d-crop-card { width: 420px; max-width: calc(100vw - 32px); }
.mp3d-crop-stage {
  position: relative;
  width: 100%;
  max-height: 60vh;
  overflow: hidden;
  display: flex;
  border-radius: 10px;
  border: 1px solid var(--mp3d-border-soft);
  background: var(--mp3d-surface);
  margin: 8px 0 12px;
  cursor: crosshair;
  touch-action: none;
}
.mp3d-crop-img { display: block; width: 100%; height: auto; max-height: 60vh; object-fit: contain; user-select: none; -webkit-user-drag: none; }
.mp3d-crop-selection {
  position: absolute;
  border: 2px dashed var(--mp3d-accent-a);
  background: rgba(34,211,238,0.15);
  pointer-events: none;
}
.mp3d-crop-loading, .mp3d-crop-error { padding: 40px 12px; text-align: center; margin: 0; }
`;

type Rect = { x: number; y: number; w: number; h: number };

/** Abre o modal de recorte já carregando `imageUrl` — busca via fetch (não `<img crossorigin>`) pra aproveitar o host_permissions da extensão e nunca "sujar" o canvas mesmo se o CDN da imagem não mandar cabeçalho CORS. */
export async function openImageCropModal(imageUrl: string, titleForFilename: string | null) {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);
  getTheme().then((t) => host.setAttribute("data-theme", t));
  const stopThemeWatch = onThemeChange((t) => host.setAttribute("data-theme", t));

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CARD_STYLES + CROP_STYLES;
  shadow.appendChild(style);

  const backdrop = document.createElement("div");
  backdrop.className = "mp3d-modal-backdrop";
  shadow.appendChild(backdrop);

  const card = document.createElement("div");
  card.className = "mp3d-modal-card mp3d-crop-card";
  backdrop.appendChild(card);

  const close = () => {
    stopThemeWatch();
    host.remove();
  };
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener(
    "keydown",
    function onKey(e) {
      if (e.key === "Escape") {
        close();
        window.removeEventListener("keydown", onKey);
      }
    },
    { once: false },
  );

  card.innerHTML = `
    <div class="mp3d-card-head">
      <span class="mp3d-brand-row">
        <img class="mp3d-brand-logo" src="${MAPH_LOGO_DATA_URI}" alt="" />
        <span class="mp3d-brand">Buscar por imagem</span>
      </span>
      <button type="button" class="mp3d-close" aria-label="Fechar">×</button>
    </div>
    <p class="mp3d-muted" style="margin-top:0">Arraste sobre a imagem pra escolher a área que quer usar na busca.</p>
    <div class="mp3d-crop-stage"><p class="mp3d-muted mp3d-crop-loading">Carregando imagem...</p></div>
    <button type="button" class="mp3d-btn mp3d-crop-search" disabled>Selecione uma área pra buscar</button>
  `;

  card.querySelector<HTMLButtonElement>(".mp3d-close")!.onclick = close;

  const stage = card.querySelector<HTMLDivElement>(".mp3d-crop-stage")!;
  const searchBtn = card.querySelector<HTMLButtonElement>(".mp3d-crop-search")!;

  let img: HTMLImageElement | null = null;
  let selection: Rect | null = null;

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    img = document.createElement("img");
    img.className = "mp3d-crop-img";
    img.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      img!.onload = () => resolve();
      img!.onerror = () => reject(new Error("falha ao carregar imagem"));
    });

    stage.innerHTML = "";
    stage.appendChild(img);

    const selectionBox = document.createElement("div");
    selectionBox.className = "mp3d-crop-selection";
    selectionBox.style.display = "none";
    stage.appendChild(selectionBox);

    let dragStart: { x: number; y: number } | null = null;
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    const updateSelection = (curX: number, curY: number) => {
      if (!dragStart || !img) return;
      const rect = stage.getBoundingClientRect();
      const x = Math.min(dragStart.x, curX);
      const y = Math.min(dragStart.y, curY);
      const w = Math.abs(curX - dragStart.x);
      const h = Math.abs(curY - dragStart.y);
      selectionBox.style.left = `${x}px`;
      selectionBox.style.top = `${y}px`;
      selectionBox.style.width = `${w}px`;
      selectionBox.style.height = `${h}px`;

      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      selection = {
        x: Math.round(x * scaleX),
        y: Math.round(y * scaleY),
        w: Math.round(w * scaleX),
        h: Math.round(h * scaleY),
      };
      const valid = selection.w > 8 && selection.h > 8;
      searchBtn.disabled = !valid;
      searchBtn.textContent = valid ? "Buscar no MakerWorld" : "Selecione uma área pra buscar";
    };

    stage.addEventListener("pointerdown", (e) => {
      const rect = stage.getBoundingClientRect();
      dragStart = { x: clamp(e.clientX - rect.left, 0, rect.width), y: clamp(e.clientY - rect.top, 0, rect.height) };
      selectionBox.style.display = "block";
      updateSelection(dragStart.x, dragStart.y);
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (!dragStart) return;
      const rect = stage.getBoundingClientRect();
      updateSelection(clamp(e.clientX - rect.left, 0, rect.width), clamp(e.clientY - rect.top, 0, rect.height));
    });
    stage.addEventListener("pointerup", () => {
      dragStart = null;
    });
  } catch {
    stage.innerHTML = `<p class="mp3d-muted mp3d-warn mp3d-crop-error">Não consegui carregar a imagem do anúncio.</p>`;
  }

  searchBtn.onclick = async () => {
    if (!img || !selection) return;
    searchBtn.disabled = true;
    searchBtn.textContent = "Preparando...";
    try {
      const canvas = document.createElement("canvas");
      canvas.width = selection.w;
      canvas.height = selection.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("sem contexto 2d");
      ctx.drawImage(img, selection.x, selection.y, selection.w, selection.h, 0, 0, selection.w, selection.h);
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("falha ao gerar recorte");

      // Baixa o arquivo — garante que o usuário tem como enviar manualmente
      // mesmo se a área de transferência não funcionar.
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `${slugify(titleForFilename ?? "anuncio")}-recorte.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);

      // Melhor esforço: copia pra área de transferência, pra colar (Ctrl+V)
      // direto no campo de busca por imagem do MakerWorld.
      try {
        if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        }
      } catch {
        /* segue sem copiar — o download já garante o arquivo */
      }

      window.open(MAKERWORLD_SEARCH_URL, "_blank", "noreferrer");
      close();
    } catch {
      searchBtn.textContent = "Não deu certo, tenta de novo";
      window.setTimeout(() => {
        searchBtn.textContent = "Buscar no MakerWorld";
        searchBtn.disabled = false;
      }, 2000);
    }
  };
}
