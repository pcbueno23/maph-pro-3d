import { useState } from "react";
import type { ShopStats } from "./aggregate";
import { formatDuration } from "./aggregate";
import type { ShopDebugInfo } from "./scrape";
import type { Diagnostic } from "../../lib/shopeeCapture";
import { RawJsonBlock } from "../RawJsonBlock";
import { LockGate } from "../LockGate";
import { MAPH_LOGO_DATA_URI } from "../logo";
import { toggleTheme } from "../../lib/theme";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtBRLCompact(v: number) {
  if (v >= 1000) return `${fmtBRL(v / 1000).replace(/,00$/, "")} mil`;
  return fmtBRL(v);
}
function fmtNum(v: number) {
  return Math.round(v).toLocaleString("pt-BR");
}

type Tab = "resumo" | "diagnostico";

export function Panel({
  loading,
  stats,
  diagnostic,
  shopDebug,
  onRescan,
  signedIn,
  isAdmin,
}: {
  loading: boolean;
  stats: ShopStats;
  diagnostic: Diagnostic | null;
  shopDebug: ShopDebugInfo | null;
  onRescan: () => void;
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>("resumo");

  if (collapsed) {
    return (
      <button className="mp3d-fab topleft" onClick={() => setCollapsed(false)} title="Abrir Maph Pro 3D">
        <img src={MAPH_LOGO_DATA_URI} alt="" />
      </button>
    );
  }

  return (
    <div className="mp3d-panel">
      <div className="mp3d-panel-head">
        <span className="mp3d-brand-row">
          <img className="mp3d-brand-logo" src={MAPH_LOGO_DATA_URI} alt="" />
          <span className="mp3d-brand">Maph Pro 3D · Raio-X da loja</span>
        </span>
        <span className="mp3d-panel-head-actions">
          <button
            type="button"
            className="mp3d-theme-toggle"
            title="Alternar tema claro/escuro"
            onClick={() => toggleTheme()}
          >
            🌓
          </button>
          <button className="mp3d-close" onClick={() => setCollapsed(true)} aria-label="Minimizar">
            –
          </button>
        </span>
      </div>

      <div className="mp3d-tabs">
        <button className={tab === "resumo" ? "mp3d-tab active" : "mp3d-tab"} onClick={() => setTab("resumo")}>
          Resumo
        </button>
        {isAdmin && (
          <button
            className={tab === "diagnostico" ? "mp3d-tab active" : "mp3d-tab"}
            onClick={() => setTab("diagnostico")}
            title="Estado interno do interceptor — útil pra depurar se algo não aparecer"
          >
            ⚙
          </button>
        )}
      </div>

      {loading && <p className="mp3d-muted">Analisando a loja ({stats.itemCount} produto(s) lidos)...</p>}

      {tab === "resumo" && (
        <LockGate locked={!signedIn} label="Faça login no Maph Pro 3D pra ver o Raio-X desta loja">
          {stats.parcial && (
            <p className="mp3d-warn" style={{ marginTop: 4 }}>
              Dado parcial: capturei {stats.itemCount} de {stats.totalNaLoja} produtos da loja. Role/pagine
              a grade pra capturar mais e os números abaixo atualizam sozinhos.
            </p>
          )}

          <div className="mp3d-hero">
            <div className="mp3d-hero-label">💰 Faturamento total (produtos capturados)</div>
            <div className="mp3d-hero-value">{fmtBRLCompact(stats.revenueTotal)}</div>
          </div>
          <div className="mp3d-hero">
            <div className="mp3d-hero-label">
              📈 Últimos 30 dias {stats.soldMonthly30dConfiavel ? "(Shopee)" : "(estimativa)"}
            </div>
            <div className="mp3d-hero-value">
              {fmtBRLCompact(stats.soldMonthly30dConfiavel ? stats.revenueMonthly30d : stats.revenueMonthly30dEstimado)}
            </div>
          </div>

          <div className="mp3d-stats-grid">
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">📦 Vendido (total)</span>
              <span className="mp3d-stat-value">{fmtNum(stats.soldTotal)}</span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">⚡ Vendido · 30 dias</span>
              <span className="mp3d-stat-value">
                {fmtNum(stats.soldMonthly30dConfiavel ? stats.soldMonthly30d : stats.soldMonthly30dEstimado)}
              </span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">📋 Produtos capturados</span>
              <span className="mp3d-stat-value">
                {stats.itemCount}
                {stats.totalNaLoja != null ? ` / ${stats.totalNaLoja}` : ""}
              </span>
            </div>
            <div className="mp3d-stat">
              <span className="mp3d-stat-label">📅 Anúncio mais antigo no ar há</span>
              <span className="mp3d-stat-value">{formatDuration(stats.oldestListingDays)}</span>
            </div>
          </div>

          {!stats.soldMonthly30dConfiavel && stats.itemCount > 0 && (
            <p className="mp3d-muted" style={{ marginTop: 6 }}>
              O campo "vendido nos últimos 30 dias" da própria Shopee não veio confiável pra essa loja (veio
              zerado em produto com venda histórica) — por isso uso a estimativa (histórico ÷ dias no ar ×
              30) em vez do dado bruto.
            </p>
          )}

          <p className="mp3d-muted" style={{ marginTop: 10 }}>
            Visitas e conversão não aparecem aqui — não existe esse dado público na Shopee (nem no app, nem
            na API que a própria página usa). Ferramentas como a EverSeller usam um banco de dados próprio
            pra estimar isso; não é algo que dê pra calcular com o que a Shopee expõe.
          </p>
        </LockGate>
      )}

      {tab === "diagnostico" && (
        <div style={{ marginTop: 8 }}>
          <p className="mp3d-muted">
            Estado do interceptor pra essa loja. Se os números acima não aparecerem, olhe aqui primeiro.
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
              <div className="mp3d-row">
                <span>Capturas de shop/rcmd_items</span>
                <strong>{diagnostic.matchedCounts.shopRcmdItems ?? 0}</strong>
              </div>
              {diagnostic.fetchesSeen > 0 && (diagnostic.matchedCounts.shopRcmdItems ?? 0) === 0 && (
                <p className="mp3d-warn" style={{ marginTop: 8 }}>
                  O interceptor está vendo chamadas de rede, mas nenhuma bateu com "shop/rcmd_items" — pode
                  ser uma loja/país que usa outro endpoint, ou a Shopee mudou. Pagine a grade de produtos pra
                  forçar mais chamadas.
                </p>
              )}
              {shopDebug && (
                <>
                  <p className="mp3d-section-label">
                    shop/rcmd_items: {shopDebug.capturesReceived} captura(s) · última trouxe{" "}
                    {shopDebug.itemsFoundLastCapture} item(ns)
                  </p>
                  {shopDebug.itemsFoundLastCapture === 0 && shopDebug.rawJsonWhenEmpty != null && (
                    <RawJsonBlock
                      label='0 itens encontrados — JSON completo (pra achar o caminho certo de "item_cards")'
                      value={shopDebug.rawJsonWhenEmpty}
                    />
                  )}
                  {shopDebug.rawFirstEntry != null && (
                    <RawJsonBlock label="1º item bruto (pra ajustar os nomes de campo)" value={shopDebug.rawFirstEntry} />
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
