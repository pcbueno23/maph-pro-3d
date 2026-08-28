import { useState } from "react";
import type { KeywordHit } from "./keywordExtract";

export function Panel({
  cardCount,
  championCount,
  keywords,
  onRescan,
}: {
  cardCount: number;
  championCount: number;
  keywords: KeywordHit[];
  onRescan: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

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
        <span className="mp3d-brand">Maph Pro 3D</span>
        <button className="mp3d-close" onClick={() => setCollapsed(true)} aria-label="Minimizar">
          –
        </button>
      </div>

      <div className="mp3d-row">
        <span>Anúncios analisados</span>
        <strong>{cardCount}</strong>
      </div>
      <div className="mp3d-row">
        <span>Marcados como campeão 🔥</span>
        <strong>{championCount}</strong>
      </div>

      <p className="mp3d-muted" style={{ marginTop: 10 }}>
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

      <button className="mp3d-btn" onClick={onRescan} style={{ marginTop: 10 }}>
        Reanalisar página
      </button>
    </div>
  );
}
