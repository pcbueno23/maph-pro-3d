/** URL base do app principal (mesmo domínio usado nos links "Abrir calculadora" do popup). */
export const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "http://localhost:3000";

/**
 * Abre (ou reaproveita) uma janela pop-up de verdade apontando pra uma
 * página do app — não um iframe: o app manda `X-Frame-Options: DENY`
 * (proteção contra clickjacking) de propósito, então embutir a página
 * dentro do card da extensão não é possível nem desejável. Usar sempre o
 * mesmo nome de janela ("mp3d_calc") faz os dois botões (custo 3D / preço
 * Shopee) reaproveitarem a MESMA janela flutuante, só trocando de página —
 * o próprio app já sabe levar o custo calculado de uma calculadora pra
 * outra (botão "Usar custo do último cálculo 3D" na calculadora Shopee).
 */
export function openCalcWindow(path: string) {
  const url = `${APP_URL}${path}`;
  const width = 1000;
  const height = 820;
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  window.open(
    url,
    "mp3d_calc",
    `width=${width},height=${height},left=${left},top=${top},popup=yes,noopener`,
  );
}
