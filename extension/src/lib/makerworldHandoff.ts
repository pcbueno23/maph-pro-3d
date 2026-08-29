/**
 * Ponte entre a aba da Shopee (onde o usuário recorta a imagem) e a aba do
 * MakerWorld (onde a extensão preenche o campo de busca por imagem sozinha).
 * Como as duas abas são domínios diferentes, não dá pra passar a imagem
 * direto — o content script da Shopee grava aqui, o content script do
 * MakerWorld lê e consome (remove) assim que usa.
 */
export const MW_PENDING_KEY = "mp3d_pending_mw_image";
/** Evita reusar uma imagem velha se o usuário abrir o MakerWorld manualmente bem depois. */
export const MW_PENDING_FRESH_MS = 60_000;

export type MwPendingImage = { dataUrl: string; filename: string; ts: number };
