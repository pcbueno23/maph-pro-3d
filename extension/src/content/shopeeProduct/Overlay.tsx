import { useEffect, useState } from "react";
import { formatBRL } from "../../../../lib/engines/shopee/engine";
import { sendToBackground } from "../../lib/messaging";
import type { AuthState, ShopeeContext } from "../../lib/messaging";
import { onAuthChange, isAdminEmail } from "../../lib/authGate";
import { openCalcWindow } from "../../lib/appUrl";
import { RawJsonBlock } from "../RawJsonBlock";
import { LockGate } from "../LockGate";
import { MAPH_LOGO_DATA_URI } from "../logo";
import {
  fetchEnrichedListing,
  getCachedListingFast,
  type EnrichedListing,
  type EnrichedListingResult,
  type ScrapedListing,
} from "./scrape";
import { downloadImagesAsZip, scrapeGalleryImageUrls } from "./downloadImages";

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
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [enrichResult, setEnrichResult] = useState<EnrichedListingResult | "loading">("loading");
  const [collapsed, setCollapsed] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "baixando" | "ok" | "erro">("idle");

  useEffect(() => {
    const refresh = () => {
      sendToBackground({ type: "GET_SHOPEE_CONTEXT" }).then(setCtx);
      sendToBackground({ type: "GET_AUTH_STATE" }).then(setAuth);
    };
    refresh();
    // O login acontece numa aba separada (popup) — reage sozinho quando a
    // sessão muda, sem precisar recarregar a página da Shopee.
    return onAuthChange(refresh);
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
  const signedIn = ctx != null && ctx.status !== "signed_out";
  const isAdmin = auth?.status === "signed_in" && isAdminEmail(auth.email);

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
          title="Baixar todas as imagens do anúncio (.zip)"
          disabled={downloadState === "baixando"}
          onClick={async () => {
            setDownloadState("baixando");
            const urls = scrapeGalleryImageUrls();
            const result = await downloadImagesAsZip(urls, listing.title);
            setDownloadState(result.ok > 0 ? "ok" : "erro");
            window.setTimeout(() => setDownloadState("idle"), 2000);
          }}
        >
          {downloadState === "baixando" ? "⏳" : downloadState === "ok" ? "✓" : downloadState === "erro" ? "⚠" : "⬇"}
        </button>
        <a href={makerWorldUrl(listing.title)} target="_blank" rel="noreferrer" title="Buscar modelo no MakerWorld">
          🧊
        </a>
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
          <LockGate locked={!signedIn}>
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
          </LockGate>

          {isAdmin && missingRichFields && (
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

      <LockGate locked={!signedIn} label="Faça login no Maph Pro 3D pra calcular seu custo e preço">
        <p className="mp3d-section-label" style={{ marginTop: 0 }}>Calcule seu preço</p>
        <button type="button" className="mp3d-btn" onClick={() => openCalcWindow("/calculadoras/custo")}>
          Calculadora de custo (3D)
        </button>
        <button
          type="button"
          className="mp3d-btn mp3d-btn-secondary"
          onClick={() => openCalcWindow("/calculadoras/shopee")}
        >
          Calculadora de preço (Shopee)
        </button>
      </LockGate>
    </div>
  );
}
