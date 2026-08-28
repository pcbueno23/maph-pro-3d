/**
 * Sugestão de palavras-chave: não existe API de SEO gratuita pra isso, então
 * a v1 usa análise de frequência nos títulos dos anúncios que já apareceram
 * na busca atual — palavras que se repetem entre os concorrentes da mesma
 * categoria tendem a ser os termos que eles apostam pra ranquear.
 */

const STOPWORDS = new Set([
  "de","da","do","das","dos","com","para","pra","em","e","ou","a","o","as","os","um","uma","uns","umas",
  "no","na","nos","nas","por","que","se","ao","aos","à","às","é","sua","seu","suas","seus","mais","menos",
  "kit","und","unid","unidade","unidades","cm","mm","peça","peças","pcs","pc","frete","grátis","gratis",
  "promoção","promocao","envio","imediato","pronta","entrega","original","novo","nova","top","premium",
]);

export type KeywordHit = { word: string; count: number };

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos pra agrupar variações
}

export function extractKeywords(titles: string[], limit = 12): KeywordHit[] {
  const counts = new Map<string, { display: string; count: number }>();

  for (const title of titles) {
    const tokens = title
      .split(/[^\p{L}0-9]+/u)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !/^\d+$/.test(t));

    const seenInTitle = new Set<string>();
    for (const token of tokens) {
      const key = normalize(token);
      if (STOPWORDS.has(key) || seenInTitle.has(key)) continue;
      seenInTitle.add(key);
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { display: token.toLowerCase(), count: 1 });
    }
  }

  return Array.from(counts.values())
    .filter((e) => e.count >= 2) // só o que se repete entre concorrentes
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => ({ word: e.display, count: e.count }));
}
