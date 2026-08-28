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

export const CARD_STYLES = `
${BASE}
.mp3d-card {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 300px;
  background: rgba(2, 6, 23, 0.96);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 16px;
  padding: 14px 16px 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
  color: #e2e8f0;
  font-size: 13px;
}
.mp3d-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
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
}
.mp3d-close:hover { color: #e2e8f0; }
.mp3d-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(51,65,85,0.9);
  background: linear-gradient(135deg, #06b6d4, #10b981);
  color: #04121a;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}
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
${BASE}
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
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 320px;
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(2, 6, 23, 0.97);
  border: 1px solid rgba(51, 65, 85, 0.9);
  border-radius: 16px;
  padding: 14px 16px 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
  color: #e2e8f0;
  font-size: 13px;
}
.mp3d-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
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
`;
