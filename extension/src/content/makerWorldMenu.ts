/**
 * Menu "Por texto" / "Por imagem" que aparece ao clicar em buscar no
 * MakerWorld — usado tanto pelo card do anúncio (Overlay.tsx) quanto pelos
 * mini-cards da busca (miniCard.ts), por isso vive fora de ambos.
 */
import { openImageCropModal } from "./imageCropModal";
import { getTheme } from "../lib/theme";

const MENU_ID = "mp3d-makerworld-menu";

/** Preserva o comportamento de sempre: busca por texto, sem mudanças. */
export function makerWorldTextUrl(title: string | null): string {
  const q = (title ?? "").split(/[-–|]/)[0].trim();
  return `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(q)}`;
}

export async function showMakerWorldMenu(anchor: HTMLElement, title: string | null, imageUrl: string | null) {
  document.getElementById(MENU_ID)?.remove();

  const theme = await getTheme();
  const dark = theme !== "light";
  const bg = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "rgba(51,65,85,0.9)" : "rgba(203,213,225,0.9)";
  const text = dark ? "#e2e8f0" : "#1e293b";
  const muted = dark ? "#64748b" : "#94a3b8";
  const hoverBg = dark ? "rgba(34,211,238,0.12)" : "rgba(8,145,178,0.1)";

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 6}px;
    left: ${rect.left}px;
    z-index: 2147483002;
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12.5px;
    min-width: 180px;
  `;

  const makeItem = (label: string, hint: string, disabled: boolean, onClick: () => void) => {
    const item = document.createElement("button");
    item.type = "button";
    item.disabled = disabled;
    item.style.cssText = `
      display: block; width: 100%; text-align: left; padding: 9px 12px;
      background: none; border: none; color: ${disabled ? muted : text};
      cursor: ${disabled ? "default" : "pointer"}; font: inherit;
    `;
    item.innerHTML = `<div>${label}</div>${hint ? `<div style="font-size:10.5px;color:${muted};margin-top:1px">${hint}</div>` : ""}`;
    if (!disabled) {
      item.onmouseenter = () => (item.style.background = hoverBg);
      item.onmouseleave = () => (item.style.background = "none");
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
        close();
      };
    }
    return item;
  };

  menu.appendChild(makeItem("🔤 Buscar por texto", "", false, () => {
    window.open(makerWorldTextUrl(title), "_blank", "noreferrer");
  }));
  menu.appendChild(
    makeItem("🖼️ Buscar por imagem", imageUrl ? "" : "sem imagem disponível", !imageUrl, () => {
      if (imageUrl) openImageCropModal(imageUrl, title);
    }),
  );

  document.body.appendChild(menu);

  const close = () => {
    menu.remove();
    document.removeEventListener("pointerdown", onOutside, true);
  };
  const onOutside = (e: PointerEvent) => {
    if (!menu.contains(e.target as Node)) close();
  };
  window.setTimeout(() => document.addEventListener("pointerdown", onOutside, true), 0);
}
