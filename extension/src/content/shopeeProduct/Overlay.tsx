import { useEffect, useMemo, useState } from "react";
import {
  calcularPrecoShopee,
  formatBRL,
  formatPct,
  type ShopeeInputs,
} from "../../../../lib/engines/shopee/engine";
import { sendToBackground } from "../../lib/messaging";
import type { ShopeeContext } from "../../lib/messaging";
import { RawJsonBlock } from "../RawJsonBlock";
import { MAPH_LOGO_DATA_URI } from "../logo";
import {
  fetchEnrichedListing,
  getCachedListingFast,
  type EnrichedListing,
  type EnrichedListingResult,
  type ScrapedListing,
} from "./scrape";

const LAST_COST_KEY = "mp3d_last_own_cost";

function useLastCost(): [number, (v: number) => void] {
  const [cost, setCost] = useState(0);
  useEffect(() => {
    chrome.storage.local.get(LAST_COST_KEY).then((r) => {
      const v = r[LAST_COST_KEY];
      if (typeof v === "number") setCost(v);
    });
  }, []);
  const update = (v: number) => {
    setCost(v);
    chrome.storage.local.set({ [LAST_COST_KEY]: v });
  };
  return [cost, update];
}

function fmtNum(n: number | null, opts?: Intl.NumberFormatOptions) {
  return n == null ? "—" : n.toLocaleString("pt-BR", opts);
}

function makerWorldUrl(title: string | null) {
  const q = (title ?? "").split(/[-–|]/)[0].trim(); // corta sufixos tipo "- Envio imediato"
  return `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(q)}`;
}

function ageBucketClass(days: number | null): "new" | "mid" | "old" {
  if (days == null) return "mid";
  if (days <= 90) return "new";
  if (days <= 365) return "mid";
  return "old";
}

export function Overlay({ listing, inline }: { listing: ScrapedListing; inline: boolean }) {
  const [ctx, setCtx] = useState<ShopeeContext | null>(null);
  const [enrichResult, setEnrichResult] = useState<EnrichedListingResult | "loading">("loading");
  const [ownCost, setOwnCost] = useLastCost();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    sendToBackground({ type: "GET_SHOPEE_CONTEXT" }).then(setCtx);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Mostra na hora o que já foi visto numa busca antes (sem esperar rede),
    // e some sozinho quando a captura ao vivo chegar com dado mais completo.
    getCachedListingFast().then((cached) => {
      if (cached && !cancelled) {
        setEnrichResult((prev) => (prev === "loading" ? { listing: cached, rawJson: null } : prev));
      }
    });
    fetchEnrichedListing().then((result) => {
      if (!cancelled) setEnrichResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [listing.title]);

  const enriched: EnrichedListing | null | "loading" =
    enrichResult === "loading" ? "loading" : enrichResult.listing;

  const results = useMemo(() => {
    if (!ctx || ctx.status !== "ok" || listing.price == null || ownCost <= 0) return null;
    const base: ShopeeInputs = { ...ctx.preset.inputs, fullCustoUnidade: ownCost, valorCompra: 0 };

    const seCobrarPrecoDoConcorrente = calcularPrecoShopee({
      ...base,
      modo: "precoTravado",
      precoTravado: listing.price,
    });

    const precoParaMinhaMeta = calcularPrecoShopee({
      ...base,
      modo: "margem",
      metaLucroPercent: base.metaLucroPercent,
    });

    return { seCobrarPrecoDoConcorrente, precoParaMinhaMeta };
  }, [ctx, ownCost, listing.price]);

  if (collapsed) {
    return (
      <button className="mp3d-fab" onClick={() => setCollapsed(false)} title="Abrir Maph Pro 3D">
        <img src={MAPH_LOGO_DATA_URI} alt="" />
      </button>
    );
  }

  const salesPerDay = enriched && enriched !== "loading" ? enriched.salesPerDay : null;
  const isChampion = salesPerDay != null && salesPerDay >= 1;
  const faturamentoTotal =
    listing.price != null && enriched && enriched !== "loading" && enriched.soldTotal != null
      ? listing.price * enriched.soldTotal
      : null;
  const missingRichFields =
    enriched != null &&
    enriched !== "loading" &&
    (enriched.soldTotal == null || enriched.reviewCount == null || enriched.favorites == null);

  return (
    <div className={`mp3d-card ${inline ? "mp3d-inline" : "mp3d-floating"}`}>
      <div className="mp3d-card-head">
        <span className="mp3d-brand">Maph Pro 3D</span>
        <button className="mp3d-close" onClick={() => setCollapsed(true)} aria-label="Minimizar">
          –
        </button>
      </div>

      <div className="mp3d-toolbar">
        <button
          type="button"
          title="Baixar imagem do anúncio"
          onClick={() => {
            const img = document.querySelector<HTMLImageElement>('meta[property="og:image"]');
            const src = img?.getAttribute("content");
            if (!src) return;
            const a = document.createElement("a");
            a.href = src;
            a.download = "anuncio.jpg";
            a.target = "_blank";
            a.rel = "noreferrer";
            a.click();
          }}
        >
          ⬇
        </button>
        <a href={makerWorldUrl(listing.title)} target="_blank" rel="noreferrer" title="Buscar modelo no MakerWorld">
          🧊
        </a>
        <button
          type="button"
          title="Copiar dados deste anúncio"
          onClick={(e) => {
            const btn = e.currentTarget;
            const lines = [
              listing.title ?? "",
              listing.price != null ? `Preço: ${formatBRL(listing.price)}` : null,
              enriched && enriched !== "loading" && enriched.soldTotal != null
                ? `Vendidos: ${enriched.soldTotal}`
                : null,
              salesPerDay != null ? `Vendas/dia: ${salesPerDay.toFixed(1)} (est.)` : null,
            ]
              .filter(Boolean)
              .join("\n");
            navigator.clipboard.writeText(lines).then(() => {
              const original = btn.textContent;
              btn.textContent = "✓";
              setTimeout(() => (btn.textContent = original), 1200);
            });
          }}
        >
          📋
        </button>
      </div>

      <div className="mp3d-row">
        <span>Preço do anúncio</span>
        <strong>{listing.price != null ? formatBRL(listing.price) : "não encontrado"}</strong>
      </div>

      {enriched === "loading" && <p className="mp3d-muted">Buscando dados do anúncio...</p>}

      {enriched === null && listing.soldCount != null && (
        <div className="mp3d-row">
          <span>Vendidos</span>
          <strong>{listing.soldCount.toLocaleString("pt-BR")}</strong>
        </div>
      )}
      {enriched === null && (
        <p className="mp3d-muted">
          Não consegui buscar os dados detalhados deste anúncio (nota, favoritos, idade) — a Shopee
          pode ter mudado o formato da resposta.
        </p>
      )}

      {enriched && enriched !== "loading" && (
        <>
          <div className="mp3d-stats-grid">
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Vendidos · total</span>
              <span className="mp3d-stat-value">{fmtNum(enriched.soldTotal)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">
                Vendas / dia
                {isChampion && <span className="mp3d-champion"> 🏆</span>}
              </span>
              <span className="mp3d-stat-value">
                {salesPerDay != null ? fmtNum(salesPerDay, { maximumFractionDigits: 1 }) : "—"}{" "}
                <span className="mp3d-muted">est.</span>
              </span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Nota</span>
              <span className="mp3d-stat-value">{fmtNum(enriched.rating, { maximumFractionDigits: 1 })}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Avaliações</span>
              <span className="mp3d-stat-value">{fmtNum(enriched.reviewCount)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Favoritos</span>
              <span className="mp3d-stat-value">{fmtNum(enriched.favorites)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Criado há</span>
              <span className="mp3d-stat-value">
                {enriched.createdDaysAgo != null ? (
                  <span className={`mp3d-age-pill ${ageBucketClass(enriched.createdDaysAgo)}`}>
                    {enriched.createdDaysAgo}d
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </div>
            {enriched.sellerName && (
              <div className="mp3d-stat mp3d-stat-wide">
                <span className="mp3d-stat-label">Vendedor</span>
                <span className="mp3d-stat-value">
                  {enriched.sellerName}
                  {enriched.sellerLocation ? ` · ${enriched.sellerLocation}` : ""}
                  {enriched.isInternational ? " · internacional" : ""}
                </span>
              </div>
            )}
          </div>

          {faturamentoTotal != null && (
            <div className="mp3d-hero" style={{ marginTop: 8 }}>
              <div className="mp3d-hero-label">Faturamento estimado (preço × vendidos)</div>
              <div className="mp3d-hero-value">{formatBRL(faturamentoTotal)}</div>
            </div>
          )}

          {missingRichFields && (
            <RawJsonBlock
              label='Alguns campos vieram vazios — JSON bruto do "pdp/get_pc"'
              value={enrichResult !== "loading" ? enrichResult.rawJson : null}
            />
          )}
        </>
      )}

      <a className="mp3d-btn mp3d-btn-secondary" href={makerWorldUrl(listing.title)} target="_blank" rel="noreferrer">
        Buscar no MakerWorld
      </a>

      <div className="mp3d-divider" />

      {ctx == null && <p className="mp3d-muted">Carregando conta...</p>}

      {ctx?.status === "signed_out" && (
        <div>
          <p className="mp3d-muted">Entre na sua conta pra simular a margem aqui.</p>
          <button className="mp3d-btn" onClick={() => sendToBackground({ type: "OPEN_POPUP_TAB" })}>
            Fazer login
          </button>
        </div>
      )}

      {ctx?.status === "no_preset" && (
        <p className="mp3d-muted">
          Configure um preset da Shopee no Maph Pro 3D (calculadora Shopee → Salvar preset) pra
          simular a margem direto aqui.
        </p>
      )}

      {ctx?.status === "ok" && (
        <>
          <label className="mp3d-label">
            Meu custo de produção
            <input
              type="number"
              min={0}
              step={0.01}
              value={ownCost || ""}
              placeholder="R$"
              onChange={(e) => setOwnCost(parseFloat(e.currentTarget.value) || 0)}
              className="mp3d-input"
            />
          </label>

          {listing.price == null && (
            <p className="mp3d-muted mp3d-warn">Não consegui ler o preço desta página.</p>
          )}

          {ownCost > 0 && results && (
            <div className="mp3d-results">
              <div className="mp3d-result-block">
                <p className="mp3d-result-title">Se eu cobrar o preço do concorrente</p>
                <p
                  className={
                    "mp3d-result-value " +
                    (results.seCobrarPrecoDoConcorrente.lucroLiquido >= 0 ? "mp3d-good" : "mp3d-bad")
                  }
                >
                  {formatBRL(results.seCobrarPrecoDoConcorrente.lucroLiquido)} de lucro (
                  {formatPct(results.seCobrarPrecoDoConcorrente.margemReal)})
                </p>
              </div>
              <div className="mp3d-result-block">
                <p className="mp3d-result-title">
                  Preço que eu preciso cobrar (meta de {formatPct(ctx.preset.inputs.metaLucroPercent)})
                </p>
                <p className="mp3d-result-value">
                  {formatBRL(results.precoParaMinhaMeta.precoFinalSugerido)}
                </p>
                {listing.price != null && (
                  <p className="mp3d-muted">
                    {results.precoParaMinhaMeta.precoFinalSugerido <= listing.price
                      ? "Dá pra cobrar até menos que o concorrente e ainda bater sua meta."
                      : "Pra bater sua meta, você precisa cobrar mais que esse anúncio."}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
