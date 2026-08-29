import { useMemo, useState } from "react";
import type { KeywordHit } from "./keywordExtract";
import type { PageStats, SellerGroup, FilterKey } from "./aggregate";
import type { Diagnostic } from "../../lib/shopeeCapture";
import type { CapturePatternKey } from "../../lib/shopeeCapturePatterns";
import type { SearchDebugInfo } from "./scrape";
import { RawJsonBlock } from "../RawJsonBlock";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtBRLCompact(v: number) {
  if (v >= 1000) return `${fmtBRL(v / 1000).replace("R$", "R$").replace(/,00$/, "")} mil`;
  return fmtBRL(v);
}
function fmtNum(v: number) {
  return Math.round(v).toLocaleString("pt-BR");
}

type Tab = "raiox" | "vendedores" | "palavras" | "diagnostico";

const PATTERN_LABELS: Record<CapturePatternKey, string> = {
  pdpGetPc: "Detalhe do anúncio (pdp/get_pc)",
  searchItems: "Resultados da busca (search_items)",
  itemGet: "item/get (endpoint antigo, fallback)",
};

export function Panel({
  loading,
  championCount,
  stats,
  sellers,
  keywords,
  diagnostic,
  searchDebug,
  activeFilter,
  onFilterChange,
  onRescan,
}: {
  loading: boolean;
  championCount: number;
  stats: PageStats;
  sellers: SellerGroup[];
  keywords: KeywordHit[];
  diagnostic: Diagnostic | null;
  searchDebug: SearchDebugInfo | null;
  activeFilter: FilterKey | null;
  onFilterChange: (filter: FilterKey) => void;
  onRescan: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>("raiox");
  const [sellerQuery, setSellerQuery] = useState("");

  const filteredSellers = useMemo(() => {
    const q = sellerQuery.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((s) => s.name.toLowerCase().includes(q));
  }, [sellers, sellerQuery]);

  if (collapsed) {
    return (
      <button className="mp3d-fab topleft" onClick={() => setCollapsed(false)} title="Abrir Maph Pro 3D">
        M
      </button>
    );
  }

  return (
    <div className="mp3d-panel">
      <div className="mp3d-panel-head">
        <span className="mp3d-brand">Maph Pro 3D · Raio-X da página</span>
        <button className="mp3d-close" onClick={() => setCollapsed(true)} aria-label="Minimizar">
          –
        </button>
      </div>

      <div className="mp3d-tabs">
        <button className={tab === "raiox" ? "mp3d-tab active" : "mp3d-tab"} onClick={() => setTab("raiox")}>
          Raio-X
        </button>
        <button
          className={tab === "vendedores" ? "mp3d-tab active" : "mp3d-tab"}
          onClick={() => setTab("vendedores")}
        >
          Vendedores
        </button>
        <button
          className={tab === "palavras" ? "mp3d-tab active" : "mp3d-tab"}
          onClick={() => setTab("palavras")}
        >
          Palavras-chave
        </button>
        <button
          className={tab === "diagnostico" ? "mp3d-tab active" : "mp3d-tab"}
          onClick={() => setTab("diagnostico")}
          title="Estado interno do interceptor — útil pra depurar se algo não aparecer"
        >
          ⚙
        </button>
      </div>

      {loading && <p className="mp3d-muted">Analisando anúncios ({stats.cardCount} lidos)...</p>}

      {tab === "raiox" && (
        <>
          <div className="mp3d-hero">
            <div className="mp3d-hero-label">Faturamento total da página</div>
            <div className="mp3d-hero-value">{fmtBRLCompact(stats.totalRevenue)}</div>
          </div>
          <div className="mp3d-hero">
            <div className="mp3d-hero-label">Estimado · últimos 30 dias</div>
            <div className="mp3d-hero-value">{fmtBRLCompact(stats.revenue30d)}</div>
          </div>

          <div className="mp3d-stats-grid">
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Vendas totais</span>
              <span className="mp3d-stat-value">{fmtNum(stats.totalSales)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Vendas · 30 dias (est.)</span>
              <span className="mp3d-stat-value">{fmtNum(stats.sales30d)}</span>
            </div>
            <button
              type="button"
              className={`mp3d-stat mp3d-filterable${activeFilter === "champion" ? " active" : ""}`}
              onClick={() => onFilterChange("champion")}
              title="Clique pra mostrar só os campeões na página"
            >
              <span className="mp3d-stat-label">Campeões 🏆 (vendas/dia)</span>
              <span className="mp3d-stat-value">{championCount}</span>
            </button>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Anúncios analisados</span>
              <span className="mp3d-stat-value">{stats.cardCount}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Menor preço</span>
              <span className="mp3d-stat-value">{stats.minPrice != null ? fmtBRL(stats.minPrice) : "—"}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Maior preço</span>
              <span className="mp3d-stat-value">{stats.maxPrice != null ? fmtBRL(stats.maxPrice) : "—"}</span>
            </div>
            <div className="mp3d-stat mp3d-stat-wide">
              <span className="mp3d-stat-label">Nacionais × internacionais</span>
              <span className="mp3d-stat-value">
                {stats.nationalCount} × {stats.internationalCount}
              </span>
            </div>
          </div>

          <p className="mp3d-section-label">
            Idade dos anúncios
            {activeFilter && (
              <span className="mp3d-filter-clear" onClick={() => onFilterChange(activeFilter)}>
                {" "}
                · filtrando, clique de novo pra limpar
              </span>
            )}
          </p>
          <div className="mp3d-age-grid">
            <button
              type="button"
              className={`mp3d-age-cell mp3d-filterable${activeFilter === "until90" ? " active" : ""}`}
              onClick={() => onFilterChange("until90")}
              title="Clique pra mostrar só esses na página"
            >
              <span className="mp3d-age-dot new" />
              <span className="mp3d-age-cell-text"><b>{stats.ageBuckets.until90}</b><span>até 90 dias</span></span>
            </button>
            <button
              type="button"
              className={`mp3d-age-cell mp3d-filterable${activeFilter === "until180" ? " active" : ""}`}
              onClick={() => onFilterChange("until180")}
              title="Clique pra mostrar só esses na página"
            >
              <span className="mp3d-age-dot mid" />
              <span className="mp3d-age-cell-text"><b>{stats.ageBuckets.until180}</b><span>até 180 dias</span></span>
            </button>
            <button
              type="button"
              className={`mp3d-age-cell mp3d-filterable${activeFilter === "until365" ? " active" : ""}`}
              onClick={() => onFilterChange("until365")}
              title="Clique pra mostrar só esses na página"
            >
              <span className="mp3d-age-dot old" />
              <span className="mp3d-age-cell-text"><b>{stats.ageBuckets.until365}</b><span>até 365 dias</span></span>
            </button>
            <button
              type="button"
              className={`mp3d-age-cell mp3d-filterable${activeFilter === "older" ? " active" : ""}`}
              onClick={() => onFilterChange("older")}
              title="Clique pra mostrar só esses na página"
            >
              <span className="mp3d-age-dot older" />
              <span className="mp3d-age-cell-text"><b>{stats.ageBuckets.older}</b><span>+ de 365 dias</span></span>
            </button>
          </div>
        </>
      )}

      {tab === "vendedores" && (
        <>
          <input
            className="mp3d-input"
            style={{ marginTop: 8 }}
            placeholder="Buscar vendedor..."
            value={sellerQuery}
            onChange={(e) => setSellerQuery(e.currentTarget.value)}
          />
          <div className="mp3d-seller-list">
            {filteredSellers.length === 0 && <p className="mp3d-muted">Nenhum vendedor identificado ainda.</p>}
            {filteredSellers.map((s) => (
              <div key={s.shopId} className="mp3d-seller">
                <div>
                  <p className="mp3d-seller-name">{s.name}</p>
                  <p className="mp3d-muted">
                    {s.location ?? "local não identificado"}
                    {s.isInternational ? " · internacional" : ""} · {s.listingCount} anúncio(s)
                  </p>
                </div>
                <span className="mp3d-stat-value">{fmtNum(s.salesPerDay30d)}/30d</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "palavras" && (
        <>
          <p className="mp3d-muted" style={{ marginTop: 8 }}>
            Palavras que mais se repetem nos títulos desta busca — pistas do que os concorrentes
            estão usando pra ranquear:
          </p>
          <div className="mp3d-kw-list">
            {keywords.length === 0 && <span className="mp3d-muted">Role a página pra carregar mais anúncios.</span>}
            {keywords.map((k) => (
              <span key={k.word} className="mp3d-kw-chip">
                {k.word} <b>×{k.count}</b>
              </span>
            ))}
          </div>
        </>
      )}

      {tab === "diagnostico" && (
        <div style={{ marginTop: 8 }}>
          <p className="mp3d-muted">
            Estado do interceptor (o script que espia as chamadas que a própria Shopee faz). Se
            algo não aparecer nos outros painéis, olhe aqui primeiro.
          </p>
          {diagnostic == null ? (
            <p className="mp3d-warn">Interceptor não respondeu ainda — a página pode não ter carregado o script.</p>
          ) : (
            <>
              <div className="mp3d-row">
                <span>Interceptor ativo há</span>
                <strong>{Math.round((Date.now() - diagnostic.loadedAt) / 1000)}s</strong>
              </div>
              <div className="mp3d-row">
                <span>Chamadas de rede vistas</span>
                <strong>{diagnostic.fetchesSeen}</strong>
              </div>
              <div className="mp3d-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span>Última URL vista</span>
                <strong style={{ wordBreak: "break-all", fontSize: 10.5 }}>
                  {diagnostic.lastUrl ?? "nenhuma ainda"}
                </strong>
              </div>
              <p className="mp3d-section-label">Capturas por tipo</p>
              {(Object.keys(PATTERN_LABELS) as CapturePatternKey[]).map((key) => (
                <div key={key} className="mp3d-row">
                  <span>{PATTERN_LABELS[key]}</span>
                  <strong>{diagnostic.matchedCounts[key] ?? 0}</strong>
                </div>
              ))}
              {diagnostic.fetchesSeen > 0 && (diagnostic.matchedCounts.searchItems ?? 0) === 0 && (
                <p className="mp3d-warn" style={{ marginTop: 8 }}>
                  O interceptor está vendo chamadas de rede, mas nenhuma bateu com "search_items"
                  — a Shopee pode ter renomeado o endpoint, ou a página carregou os resultados de
                  outro jeito. Role a página pra forçar mais chamadas.
                </p>
              )}

              {searchDebug && (
                <>
                  <p className="mp3d-section-label">
                    search_items: {searchDebug.capturesReceived} captura(s) · última trouxe{" "}
                    {searchDebug.itemsFoundLastCapture} item(ns)
                  </p>
                  {searchDebug.itemsFoundLastCapture === 0 && searchDebug.rawJsonWhenEmpty != null && (
                    <RawJsonBlock
                      label='0 itens encontrados — JSON completo (pra achar o caminho certo de "items")'
                      value={searchDebug.rawJsonWhenEmpty}
                    />
                  )}
                  {searchDebug.rawFirstEntry != null && (
                    <RawJsonBlock
                      label="1º item bruto (pra ajustar os nomes de campo)"
                      value={searchDebug.rawFirstEntry}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      <button className="mp3d-btn" onClick={onRescan} style={{ marginTop: 10 }}>
        Reanalisar página
      </button>
    </div>
  );
}
