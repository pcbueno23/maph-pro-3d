/**
 * CSS bruto injetado dentro do Shadow DOM dos overlays — isolado da página da
 * Shopee (não vaza pra fora, e o CSS da Shopee não vaza pra dentro). Segue a
 * mesma identidade visual do app principal (fundo slate-950, gradiente
 * cyan→emerald, cards com glass panel).
 */

const BASE = `
  :host, * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
`;

/** Classes usadas tanto no card do anúncio quanto no painel da busca. */
const SHARED = `
${BASE}
.mp3d-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(51,65,85,0.9);
  background: linear-gradient(135deg, #06b6d4, #10b981);
  color: #04121a;
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}
.mp3d-fab img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mp3d-brand {
  font-weight: 700;
  font-size: 12px;
  background: linear-gradient(90deg, #22d3ee, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.02em;
}
.mp3d-close {
  background: none;
  border: 1px solid rgba(71,85,105,0.7);
  color: #94a3b8;
  border-radius: 6px;
  width: 22px;
  height: 22px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}
.mp3d-close:hover { color: #e2e8f0; }
.mp3d-muted { color: #94a3b8; font-size: 12px; margin: 4px 0; line-height: 1.5; }
.mp3d-warn { color: #fbbf24; }
.mp3d-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(51,65,85,0.5);
  font-size: 12.5px;
}
.mp3d-row strong { color: #f1f5f9; font-weight: 600; }
.mp3d-label {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}
.mp3d-input {
  display: block;
  width: 100%;
  margin-top: 4px;
  background: rgba(15,23,42,0.7);
  border: 1px solid rgba(51,65,85,0.9);
  border-radius: 8px;
  padding: 7px 10px;
  color: #f1f5f9;
  font-size: 13px;
}
.mp3d-input:focus { outline: 2px solid rgba(34,211,238,0.4); border-color: #22d3ee; }
.mp3d-btn {
  width: 100%;
  display: block;
  text-align: center;
  text-decoration: none;
  margin-top: 6px;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  color: #04121a;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
}
.mp3d-btn-secondary {
  display: block;
  text-align: center;
  text-decoration: none;
  margin-top: 8px;
  background: rgba(34,211,238,0.1);
  border: 1px solid rgba(34,211,238,0.35);
  color: #67e8f9;
  border-radius: 8px;
  padding: 7px 10px;
  font-weight: 600;
  font-size: 12px;
}
.mp3d-btn-secondary:hover { background: rgba(34,211,238,0.18); }
.mp3d-divider { height: 1px; background: rgba(51,65,85,0.6); margin: 10px 0; }
.mp3d-toolbar { display: flex; gap: 4px; margin-bottom: 8px; }
.mp3d-toolbar button, .mp3d-toolbar a {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(51,65,85,0.7);
  background: rgba(15,23,42,0.7);
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
  text-decoration: none;
}
.mp3d-toolbar button:hover, .mp3d-toolbar a:hover { color: #67e8f9; border-color: rgba(34,211,238,0.4); }
.mp3d-age-pill { font-weight: 700; padding: 1px 7px; border-radius: 999px; font-size: 11px; }
.mp3d-age-pill.new { background: rgba(52,211,153,0.15); color: #34d399; }
.mp3d-age-pill.mid { background: rgba(251,191,36,0.15); color: #fbbf24; }
.mp3d-age-pill.old { background: rgba(251,113,133,0.15); color: #fb7185; }
.mp3d-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 8px 0;
}
.mp3d-stat {
  background: rgba(15,23,42,0.55);
  border: 1px solid rgba(51,65,85,0.55);
  border-radius: 8px;
  padding: 6px 8px;
}
.mp3d-stat-wide { grid-column: 1 / -1; }
.mp3d-stat-label {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.mp3d-stat-value {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}
.mp3d-champion { font-size: 11px; }
.mp3d-section-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  margin: 12px 0 6px;
}
.mp3d-filterable {
  appearance: none;
  -webkit-appearance: none;
  display: block;
  width: 100%;
  text-align: left;
  margin: 0;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mp3d-filterable:hover { border-color: rgba(34,211,238,0.4) !important; }
.mp3d-filterable.active {
  border-color: rgba(34,211,238,0.7) !important;
  background: rgba(34,211,238,0.12) !important;
  box-shadow: 0 0 0 1px rgba(34,211,238,0.3) inset;
}
.mp3d-filter-clear {
  background: none;
  border: none;
  padding: 0;
  text-transform: none;
  letter-spacing: normal;
  color: #67e8f9;
  cursor: pointer;
  font-size: 10px;
}
.mp3d-filter-clear:hover { text-decoration: underline; }
.mp3d-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2,6,23,0.7);
}
.mp3d-modal-card {
  width: 320px;
  max-width: calc(100vw - 32px);
  background: rgba(2, 6, 23, 0.98);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 16px;
  padding: 16px 18px 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  color: #e2e8f0;
  font-size: 13px;
}
.mp3d-kw-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.mp3d-kw-chip {
  background: rgba(34,211,238,0.12);
  border: 1px solid rgba(34,211,238,0.3);
  color: #67e8f9;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11.5px;
}
.mp3d-kw-chip b { color: #a5f3fc; }
.mp3d-lock-wrap { position: relative; }
.mp3d-locked {
  filter: blur(6px);
  user-select: none;
  pointer-events: none;
}
.mp3d-lock-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 12px;
  background: rgba(2,6,23,0.55);
  border-radius: 10px;
}
.mp3d-lock-icon { font-size: 20px; }
.mp3d-lock-text { font-size: 11.5px; color: #e2e8f0; font-weight: 600; max-width: 220px; line-height: 1.4; }
.mp3d-lock-btn {
  margin-top: 2px;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  color: #04121a;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 700;
  font-size: 11.5px;
  cursor: pointer;
}
`;

export const CARD_STYLES = `
${SHARED}
.mp3d-card {
  background: rgba(2, 6, 23, 0.96);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 16px;
  padding: 14px 16px 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
  color: #e2e8f0;
  font-size: 13px;
}
/* Local preferido: logo abaixo do título do anúncio (mesmo lugar onde
   concorrentes como o "3D Hunt" mostram o painel) — a posição/largura vem
   do host (ver content/shopeeProduct/index.tsx), então aqui só preenche. */
.mp3d-card.mp3d-inline {
  position: relative;
  width: 100%;
}
/* Reserva: quando não achamos onde encaixar no fluxo da página (Shopee mudou
   a estrutura), volta a flutuar fixo no canto pra nunca ficar invisível. */
.mp3d-card.mp3d-floating {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;
}
.mp3d-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.mp3d-results { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
.mp3d-result-block {
  background: rgba(15,23,42,0.6);
  border: 1px solid rgba(51,65,85,0.6);
  border-radius: 10px;
  padding: 8px 10px;
}
.mp3d-result-title { font-size: 11px; color: #94a3b8; margin: 0 0 3px; }
.mp3d-result-value { font-size: 15px; font-weight: 700; margin: 0; color: #f1f5f9; }
.mp3d-good { color: #34d399; }
.mp3d-bad { color: #fb7185; }
`;

export const BADGE_STYLES = `
${SHARED}
.mp3d-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 999;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  color: #04121a;
  font-weight: 800;
  font-size: 10.5px;
  padding: 3px 7px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  pointer-events: none;
}
.mp3d-panel {
  position: fixed;
  left: 16px;
  top: 16px;
  z-index: 2147483000;
  width: 300px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: rgba(2, 6, 23, 0.97);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 16px;
  padding: 14px 16px 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
  color: #e2e8f0;
  font-size: 13px;
}
.mp3d-fab.topleft { left: 16px; top: 16px; right: auto; bottom: auto; }
.mp3d-hero {
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, rgba(6,182,212,0.16), rgba(16,185,129,0.1));
  border: 1px solid rgba(34,211,238,0.25);
}
.mp3d-hero-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
.mp3d-hero-value {
  margin-top: 2px;
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(90deg, #67e8f9, #6ee7b7);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}
.mp3d-age-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.mp3d-age-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(15,23,42,0.55);
  border: 1px solid rgba(51,65,85,0.55);
  border-radius: 8px;
  padding: 6px 8px;
}
.mp3d-age-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.mp3d-age-dot.new { background: #34d399; }
.mp3d-age-dot.mid { background: #fbbf24; }
.mp3d-age-dot.old { background: #fb7185; }
.mp3d-age-dot.older { background: #f43f5e; }
.mp3d-age-cell-text { display: flex; flex-direction: column; line-height: 1.2; }
.mp3d-age-cell-text b { font-size: 13px; color: #f1f5f9; }
.mp3d-age-cell-text span { font-size: 9.5px; color: #94a3b8; }
.mp3d-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.mp3d-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid rgba(51,65,85,0.6);
  padding-bottom: 8px;
  margin-bottom: 4px;
}
.mp3d-tab {
  flex: 1;
  background: none;
  border: 1px solid transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.mp3d-tab.active {
  background: rgba(34,211,238,0.12);
  border-color: rgba(34,211,238,0.35);
  color: #67e8f9;
}
.mp3d-age-buckets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 11.5px;
  color: #94a3b8;
}
.mp3d-age-buckets b { color: #f1f5f9; }
.mp3d-seller-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.mp3d-seller {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: rgba(15,23,42,0.55);
  border: 1px solid rgba(51,65,85,0.55);
  border-radius: 8px;
  padding: 7px 9px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mp3d-seller:hover { border-color: rgba(34,211,238,0.4); background: rgba(15,23,42,0.8); }
.mp3d-seller-name { font-size: 12.5px; font-weight: 600; color: #f1f5f9; margin: 0; }
`;
