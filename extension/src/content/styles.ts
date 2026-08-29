/**
 * CSS bruto injetado dentro do Shadow DOM dos overlays — isolado da página da
 * Shopee (não vaza pra fora, e o CSS da Shopee não vaza pra dentro). Segue a
 * mesma identidade visual do app principal (gradiente cyan→emerald, cards
 * com glass panel), com suporte a tema claro/escuro via CSS custom
 * properties (ver lib/theme.ts) — cada host aplica `data-theme="light"`
 * nele mesmo pra trocar os tokens abaixo.
 */

const BASE = `
  :host, * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  :host {
    --mp3d-bg: rgba(2, 6, 23, 0.97);
    --mp3d-border: rgba(51, 65, 85, 0.9);
    --mp3d-border-soft: rgba(51, 65, 85, 0.5);
    --mp3d-text: #e2e8f0;
    --mp3d-text-strong: #f1f5f9;
    --mp3d-muted: #94a3b8;
    --mp3d-surface: rgba(15, 23, 42, 0.55);
    --mp3d-surface-border: rgba(51, 65, 85, 0.55);
    --mp3d-accent-a: #06b6d4;
    --mp3d-accent-b: #10b981;
    --mp3d-accent-text: #67e8f9;
    --mp3d-accent-soft-bg: rgba(34, 211, 238, 0.1);
    --mp3d-accent-soft-border: rgba(34, 211, 238, 0.35);
    --mp3d-on-accent: #04121a;
    --mp3d-good: #34d399;
    --mp3d-bad: #fb7185;
    --mp3d-warn: #fbbf24;
    --mp3d-gold: #facc15;
    --mp3d-gold-soft-bg: rgba(250, 204, 21, 0.18);
    --mp3d-gold-soft-border: rgba(250, 204, 21, 0.35);
    --mp3d-shadow: rgba(0, 0, 0, 0.45);
    --mp3d-backdrop: rgba(2, 6, 23, 0.7);
  }
  :host([data-theme="light"]) {
    --mp3d-bg: rgba(255, 255, 255, 0.98);
    --mp3d-border: rgba(203, 213, 225, 0.9);
    --mp3d-border-soft: rgba(203, 213, 225, 0.7);
    --mp3d-text: #1e293b;
    --mp3d-text-strong: #0f172a;
    --mp3d-muted: #64748b;
    --mp3d-surface: #f1f5f9;
    --mp3d-surface-border: rgba(203, 213, 225, 0.9);
    --mp3d-accent-text: #0e7490;
    --mp3d-accent-soft-bg: rgba(8, 145, 178, 0.08);
    --mp3d-accent-soft-border: rgba(8, 145, 178, 0.3);
    --mp3d-good: #059669;
    --mp3d-bad: #e11d48;
    --mp3d-warn: #b45309;
    --mp3d-gold: #b45309;
    --mp3d-gold-soft-bg: rgba(217, 119, 6, 0.12);
    --mp3d-gold-soft-border: rgba(217, 119, 6, 0.35);
    --mp3d-shadow: rgba(15, 23, 42, 0.14);
    --mp3d-backdrop: rgba(15, 23, 42, 0.35);
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
  border: 1px solid var(--mp3d-border);
  background: linear-gradient(135deg, var(--mp3d-accent-a), var(--mp3d-accent-b));
  color: var(--mp3d-on-accent);
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 6px 20px var(--mp3d-shadow);
}
.mp3d-fab img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mp3d-brand-row { display: flex; align-items: center; gap: 6px; }
.mp3d-brand-logo { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }
.mp3d-brand {
  font-weight: 700;
  font-size: 12px;
  background: linear-gradient(90deg, var(--mp3d-accent-a), var(--mp3d-accent-b));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.02em;
}
.mp3d-theme-toggle {
  background: none;
  border: 1px solid var(--mp3d-border-soft);
  color: var(--mp3d-muted);
  border-radius: 6px;
  width: 22px;
  height: 22px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mp3d-theme-toggle:hover { color: var(--mp3d-text); }
.mp3d-close {
  background: none;
  border: 1px solid var(--mp3d-border-soft);
  color: var(--mp3d-muted);
  border-radius: 6px;
  width: 22px;
  height: 22px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}
.mp3d-close:hover { color: var(--mp3d-text); }
.mp3d-muted { color: var(--mp3d-muted); font-size: 12px; margin: 4px 0; line-height: 1.5; }
.mp3d-warn { color: var(--mp3d-warn); }
.mp3d-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--mp3d-border-soft);
  font-size: 12.5px;
}
.mp3d-row strong { color: var(--mp3d-text-strong); font-weight: 600; }
.mp3d-label {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mp3d-muted);
}
.mp3d-input {
  display: block;
  width: 100%;
  margin-top: 4px;
  background: var(--mp3d-surface);
  border: 1px solid var(--mp3d-border);
  border-radius: 8px;
  padding: 7px 10px;
  color: var(--mp3d-text-strong);
  font-size: 13px;
}
.mp3d-input:focus { outline: 2px solid var(--mp3d-accent-soft-border); border-color: var(--mp3d-accent-a); }
.mp3d-btn {
  width: 100%;
  display: block;
  text-align: center;
  text-decoration: none;
  margin-top: 6px;
  background: linear-gradient(90deg, var(--mp3d-accent-a), var(--mp3d-accent-b));
  color: var(--mp3d-on-accent);
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
  background: var(--mp3d-accent-soft-bg);
  border: 1px solid var(--mp3d-accent-soft-border);
  color: var(--mp3d-accent-text);
  border-radius: 8px;
  padding: 7px 10px;
  font-weight: 600;
  font-size: 12px;
}
.mp3d-btn-secondary:hover { background: var(--mp3d-accent-soft-bg); filter: brightness(1.15); }
.mp3d-divider { height: 1px; background: var(--mp3d-border-soft); margin: 10px 0; }
.mp3d-toolbar { display: flex; gap: 4px; margin-bottom: 8px; }
.mp3d-toolbar button, .mp3d-toolbar a {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--mp3d-border-soft);
  background: var(--mp3d-surface);
  color: var(--mp3d-muted);
  cursor: pointer;
  font-size: 12px;
  text-decoration: none;
}
.mp3d-toolbar button:hover, .mp3d-toolbar a:hover { color: var(--mp3d-accent-text); border-color: var(--mp3d-accent-soft-border); }
.mp3d-age-pill { font-weight: 700; padding: 1px 7px; border-radius: 999px; font-size: 11px; }
.mp3d-age-pill.new { background: rgba(52,211,153,0.15); color: var(--mp3d-good); }
.mp3d-age-pill.mid { background: rgba(251,191,36,0.15); color: var(--mp3d-warn); }
.mp3d-age-pill.old { background: rgba(251,113,133,0.15); color: var(--mp3d-bad); }
.mp3d-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 8px 0;
}
.mp3d-stat {
  background: var(--mp3d-surface);
  border: 1px solid var(--mp3d-surface-border);
  border-radius: 8px;
  padding: 6px 8px;
}
.mp3d-stat-wide { grid-column: 1 / -1; }
.mp3d-stat-label {
  display: block;
  font-size: 10px;
  color: var(--mp3d-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.mp3d-stat-value {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 700;
  color: var(--mp3d-text-strong);
}
.mp3d-champion { font-size: 11px; }
.mp3d-section-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mp3d-muted);
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
.mp3d-filterable:hover { border-color: var(--mp3d-accent-soft-border) !important; }
.mp3d-filterable.active {
  border-color: var(--mp3d-accent-a) !important;
  background: var(--mp3d-accent-soft-bg) !important;
  box-shadow: 0 0 0 1px var(--mp3d-accent-soft-border) inset;
}
.mp3d-filter-clear {
  background: none;
  border: none;
  padding: 0;
  text-transform: none;
  letter-spacing: normal;
  color: var(--mp3d-accent-text);
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
  background: var(--mp3d-backdrop);
}
.mp3d-modal-card {
  width: 320px;
  max-width: calc(100vw - 32px);
  background: var(--mp3d-bg);
  border: 1px solid var(--mp3d-border);
  border-radius: 16px;
  padding: 16px 18px 18px;
  box-shadow: 0 20px 60px var(--mp3d-shadow);
  color: var(--mp3d-text);
  font-size: 13px;
}
.mp3d-kw-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.mp3d-kw-chip {
  background: var(--mp3d-accent-soft-bg);
  border: 1px solid var(--mp3d-accent-soft-border);
  color: var(--mp3d-accent-text);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11.5px;
}
.mp3d-kw-chip b { color: var(--mp3d-text-strong); }
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
  background: var(--mp3d-backdrop);
  border-radius: 10px;
}
.mp3d-lock-icon { font-size: 20px; }
.mp3d-lock-text { font-size: 11.5px; color: var(--mp3d-text); font-weight: 600; max-width: 220px; line-height: 1.4; }
.mp3d-lock-btn {
  margin-top: 2px;
  background: linear-gradient(90deg, var(--mp3d-accent-a), var(--mp3d-accent-b));
  color: var(--mp3d-on-accent);
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
  background: var(--mp3d-bg);
  border: 1px solid var(--mp3d-border);
  border-radius: 16px;
  padding: 14px 16px 16px;
  box-shadow: 0 8px 30px var(--mp3d-shadow);
  color: var(--mp3d-text);
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
  gap: 8px;
  margin-bottom: 8px;
}
.mp3d-card-head-actions { display: flex; align-items: center; gap: 4px; }
.mp3d-results { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
.mp3d-result-block {
  background: var(--mp3d-surface);
  border: 1px solid var(--mp3d-surface-border);
  border-radius: 10px;
  padding: 8px 10px;
}
.mp3d-result-title { font-size: 11px; color: var(--mp3d-muted); margin: 0 0 3px; }
.mp3d-result-value { font-size: 15px; font-weight: 700; margin: 0; color: var(--mp3d-text-strong); }
.mp3d-good { color: var(--mp3d-good); }
.mp3d-bad { color: var(--mp3d-bad); }
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
  background: linear-gradient(90deg, var(--mp3d-accent-a), var(--mp3d-accent-b));
  color: var(--mp3d-on-accent);
  font-weight: 800;
  font-size: 10.5px;
  padding: 3px 7px;
  border-radius: 999px;
  box-shadow: 0 2px 8px var(--mp3d-shadow);
  pointer-events: none;
}
/* Posição real vem do host (position:fixed + arrastável pelo usuário — ver
   content/shopeeSearch/index.tsx), não daqui. */
.mp3d-panel {
  background: var(--mp3d-bg);
  border: 1px solid var(--mp3d-border);
  border-radius: 16px;
  padding: 14px 16px 16px;
  box-shadow: 0 8px 30px var(--mp3d-shadow);
  color: var(--mp3d-text);
  font-size: 13px;
  width: 320px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  overflow-x: hidden;
}
.mp3d-fab.topleft { left: 16px; top: 16px; right: auto; bottom: auto; }
.mp3d-hero {
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, rgba(6,182,212,0.16), rgba(16,185,129,0.1));
  border: 1px solid var(--mp3d-accent-soft-border);
}
.mp3d-hero-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mp3d-muted); }
.mp3d-hero-value {
  margin-top: 2px;
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(90deg, var(--mp3d-accent-a), var(--mp3d-accent-b));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}
.mp3d-champion-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--mp3d-gold-soft-bg), rgba(217,119,6,0.1));
  border: 1px solid var(--mp3d-gold-soft-border);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.mp3d-champion-badge:hover { border-color: var(--mp3d-gold); }
.mp3d-champion-badge.active { border-color: var(--mp3d-gold); box-shadow: 0 0 0 1px var(--mp3d-gold-soft-border) inset; }
.mp3d-champion-badge-icon { font-size: 22px; line-height: 1; }
.mp3d-champion-badge-text { display: flex; flex-direction: column; line-height: 1.25; }
.mp3d-champion-badge-count { font-size: 19px; font-weight: 800; color: var(--mp3d-gold); }
.mp3d-champion-badge-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mp3d-gold); }
.mp3d-age-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.mp3d-age-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--mp3d-surface);
  border: 1px solid var(--mp3d-surface-border);
  border-radius: 8px;
  padding: 6px 8px;
}
.mp3d-age-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.mp3d-age-dot.new { background: var(--mp3d-good); }
.mp3d-age-dot.mid { background: var(--mp3d-warn); }
.mp3d-age-dot.old { background: var(--mp3d-bad); }
.mp3d-age-dot.older { background: #f43f5e; }
.mp3d-age-cell-text { display: flex; flex-direction: column; line-height: 1.2; }
.mp3d-age-cell-text b { font-size: 13px; color: var(--mp3d-text-strong); }
.mp3d-age-cell-text span { font-size: 9.5px; color: var(--mp3d-muted); }
.mp3d-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  cursor: move;
  user-select: none;
  touch-action: none;
}
.mp3d-panel-head .mp3d-close, .mp3d-panel-head .mp3d-theme-toggle { cursor: pointer; }
.mp3d-panel-head-actions { display: flex; align-items: center; gap: 4px; }
.mp3d-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--mp3d-border-soft);
  padding-bottom: 8px;
  margin-bottom: 4px;
}
.mp3d-tab {
  flex: 1;
  background: none;
  border: 1px solid transparent;
  color: var(--mp3d-muted);
  font-size: 11px;
  font-weight: 600;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.mp3d-tab.active {
  background: var(--mp3d-accent-soft-bg);
  border-color: var(--mp3d-accent-soft-border);
  color: var(--mp3d-accent-text);
}
.mp3d-age-buckets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 11.5px;
  color: var(--mp3d-muted);
}
.mp3d-age-buckets b { color: var(--mp3d-text-strong); }
.mp3d-seller-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.mp3d-seller {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: var(--mp3d-surface);
  border: 1px solid var(--mp3d-surface-border);
  border-radius: 8px;
  padding: 7px 9px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mp3d-seller:hover { border-color: var(--mp3d-accent-soft-border); }
.mp3d-seller-name { font-size: 12.5px; font-weight: 600; color: var(--mp3d-text-strong); margin: 0; }
`;
