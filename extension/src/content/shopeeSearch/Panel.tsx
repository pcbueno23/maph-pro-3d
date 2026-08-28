import { useMemo, useState } from "react";
import type { KeywordHit } from "./keywordExtract";
import type { PageStats, SellerGroup } from "./aggregate";

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

type Tab = "raiox" | "vendedores" | "palavras";

export function Panel({
  loading,
  championCount,
  stats,
  sellers,
  keywords,
  onRescan,
}: {
  loading: boolean;
  championCount: number;
  stats: PageStats;
  sellers: SellerGroup[];
  keywords: KeywordHit[];
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
      <button className="mp3d-fab" onClick={() => setCollapsed(false)} title="Abrir Maph Pro 3D">
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
      </div>

      {loading && <p className="mp3d-muted">Analisando anúncios ({stats.cardCount} lidos)...</p>}

      {tab === "raiox" && (
        <>
          <div className="mp3d-stats-grid">
            <div className="mp3d-stat mp3d-stat-wide">
              <span className="mp3d-stat-label">Faturamento total da página</span>
              <span className="mp3d-stat-value">{fmtBRLCompact(stats.totalRevenue)}</span>
            </div>
            <div className="mp3d-stat mp3d-stat-wide">
              <span className="mp3d-stat-label">Faturamento estimado · últimos 30 dias</span>
              <span className="mp3d-stat-value">{fmtBRLCompact(stats.revenue30d)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Vendas totais</span>
              <span className="mp3d-stat-value">{fmtNum(stats.totalSales)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Vendas · 30 dias (est.)</span>
              <span className="mp3d-stat-value">{fmtNum(stats.sales30d)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Menor preço</span>
              <span className="mp3d-stat-value">{stats.minPrice != null ? fmtBRL(stats.minPrice) : "—"}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Maior preço</span>
              <span className="mp3d-stat-value">{stats.maxPrice != null ? fmtBRL(stats.maxPrice) : "—"}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Campeões 🏆 (vendas/dia)</span>
              <span className="mp3d-stat-value">{championCount}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">Nacionais × internacionais</span>
              <span className="mp3d-stat-value">
                {stats.nationalCount} × {stats.internationalCount}
              </span>
            </div>
          </div>

          <p className="mp3d-section-label">Idade dos anúncios</p>
          <div className="mp3d-age-buckets">
            <span>até 90d: <b>{stats.ageBuckets.until90}</b></span>
            <span>até 180d: <b>{stats.ageBuckets.until180}</b></span>
            <span>até 365d: <b>{stats.ageBuckets.until365}</b></span>
            <span>+365d: <b>{stats.ageBuckets.older}</b></span>
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

      <button className="mp3d-btn" onClick={onRescan} style={{ marginTop: 10 }}>
        Reanalisar página
      </button>
    </div>
  );
}
