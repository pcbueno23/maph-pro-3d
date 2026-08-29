import { useMemo, useState } from "react";

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Bloco de JSON bruto, direto na tela, com botão de copiar — pra não depender do console do DevTools. */
export function RawJsonBlock({ label, value }: { label: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => safeStringify(value), [value]);

  return (
    <div style={{ marginTop: 6 }}>
      <div className="mp3d-row" style={{ borderBottom: "none", paddingBottom: 2 }}>
        <span className="mp3d-muted">{label}</span>
        <button
          className="mp3d-btn-secondary"
          style={{ marginTop: 0, padding: "3px 8px", fontSize: 10.5 }}
          onClick={() => {
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <pre
        style={{
          maxHeight: 180,
          overflow: "auto",
          background: "rgba(15,23,42,0.7)",
          border: "1px solid rgba(51,65,85,0.6)",
          borderRadius: 8,
          padding: 8,
          fontSize: 10,
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: "#cbd5e1",
        }}
      >
        {text}
      </pre>
    </div>
  );
}
