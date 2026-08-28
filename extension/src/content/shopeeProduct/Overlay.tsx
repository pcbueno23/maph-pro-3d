import { useEffect, useMemo, useState } from "react";
import {
  calcularPrecoShopee,
  formatBRL,
  formatPct,
  type ShopeeInputs,
} from "../../../../lib/engines/shopee/engine";
import { sendToBackground } from "../../lib/messaging";
import type { ShopeeContext } from "../../lib/messaging";
import type { ScrapedListing } from "./scrape";

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

export function Overlay({ listing }: { listing: ScrapedListing }) {
  const [ctx, setCtx] = useState<ShopeeContext | null>(null);
  const [ownCost, setOwnCost] = useLastCost();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    sendToBackground({ type: "GET_SHOPEE_CONTEXT" }).then(setCtx);
  }, []);

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
        M
      </button>
    );
  }

  return (
    <div className="mp3d-card">
      <div className="mp3d-card-head">
        <span className="mp3d-brand">Maph Pro 3D</span>
        <button className="mp3d-close" onClick={() => setCollapsed(true)} aria-label="Minimizar">
          –
        </button>
      </div>

      {ctx == null && <p className="mp3d-muted">Carregando...</p>}

      {ctx?.status === "signed_out" && (
        <div>
          <p className="mp3d-muted">Entre na sua conta pra simular a margem aqui.</p>
          <button
            className="mp3d-btn"
            onClick={() => sendToBackground({ type: "OPEN_POPUP_TAB" })}
          >
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
          <div className="mp3d-row">
            <span>Preço do anúncio</span>
            <strong>{listing.price != null ? formatBRL(listing.price) : "não encontrado"}</strong>
          </div>
          {listing.soldCount != null && (
            <div className="mp3d-row">
              <span>Vendidos</span>
              <strong>{listing.soldCount.toLocaleString("pt-BR")}</strong>
            </div>
          )}

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
