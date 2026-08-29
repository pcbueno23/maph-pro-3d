/**
 * Acha o cabeçalho "Filtros" da barra lateral de busca — `.shopee-search-
 * filter-status__text` é uma classe semântica de verdade (não ofuscada
 * pelo build deles, ao contrário do que vimos na página de anúncio), então
 * é um seletor razoavelmente estável pra ancorar o painel logo acima dela
 * — mesmo lugar onde concorrentes como o "3D Hunt" mostram o painel deles.
 */
export function findFilterAnchor(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".shopee-search-filter-status__text");
}
