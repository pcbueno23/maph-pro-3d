import type { MlInputs, MlResult } from "@/lib/engines/ml/engine";
import type { ShopeeInputs, ShopeeResult } from "@/lib/engines/shopee/engine";

function esc(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  return `${(v ?? 0).toFixed(1)}%`;
}

export function openPrintWindow(html: string) {
  // Mantido para debug/manual; preferir openPrintRoute (mais confiável).
  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  window.open(url, "_blank");
}

type PrintKind = "ml" | "shopee";

export function openPrintRoute(args: {
  kind: PrintKind;
  productName?: string;
  inputs: MlInputs | ShopeeInputs;
  result: MlResult | ShopeeResult | null;
}) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const key = `maph-print:${args.kind}:${id}`;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(key, JSON.stringify(args));
    window.open(`/print/${args.kind}?key=${encodeURIComponent(key)}`, "_blank");
  }
}

function baseDoc(title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    @page { margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; }
    .muted { color: #475569; }
    .title { font-size: 14px; font-weight: 800; }
    .subtitle { font-size: 12px; }
    .row { display:flex; justify-content:space-between; gap:16px; }
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { border:1px solid #e2e8f0; border-radius: 12px; padding: 10px; }
    .h { font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; margin:0 0 6px; color:#334155; }
    table { width:100%; border-collapse: collapse; }
    td { padding: 4px 0; font-size: 12px; }
    td:last-child { text-align:right; font-weight: 700; }
    .big { font-size: 22px; font-weight: 900; }
    .hr { border-top:1px solid #e2e8f0; margin: 10px 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function buildMlPrintHtml(args: {
  productName?: string;
  inputs: MlInputs;
  result: MlResult | null;
}) {
  const { productName, inputs, result } = args;
  const totalCustos = result
    ? result.custoBase +
      result.custos.comissao +
      result.custos.taxaFixa +
      result.custos.frete +
      result.custos.ads +
      result.custos.nf +
      result.custos.opsPercent +
      result.custos.promo +
      result.custos.cupom +
      result.custos.oferta
    : 0;

  const body = `
  <div class="row" style="align-items:flex-start;">
    <div>
      <div class="title">MAPH PRO 3D</div>
      <div class="subtitle muted">Calculadora de Precificação · Mercado Livre 2026</div>
      ${productName?.trim() ? `<div class="subtitle">Produto: <b>${esc(productName.trim())}</b></div>` : ""}
    </div>
    <div class="subtitle muted" style="text-align:right;">
      ${esc(new Date().toLocaleString("pt-BR"))}
    </div>
  </div>
  <div class="hr"></div>

  <div class="grid2">
    <div class="card">
      <div class="h">Dados do produto</div>
      <table>
        <tr><td class="muted">Custo 3D / unidade</td><td>${brl(inputs.fullCustoUnidade)}</td></tr>
        <tr><td class="muted">Custo de compra</td><td>${brl(inputs.valorCompra)}</td></tr>
        <tr><td class="muted">Material de envio</td><td>${brl(inputs.custoEnvioMaterial)}</td></tr>
        <tr><td class="muted">Custos fixos / unidade</td><td>${brl(inputs.custosFixos)}</td></tr>
        <tr><td class="muted">Nota fiscal</td><td>${pct(inputs.notaFiscalPercent)}</td></tr>
        <tr><td class="muted">Custos operacionais</td><td>${pct(inputs.custosOperacionaisPercent)}</td></tr>
        <tr><td class="muted">Estimativa mensal</td><td>${inputs.estimativaVendas} vendas</td></tr>
      </table>
    </div>
    <div class="card">
      <div class="h">Configuração do anúncio</div>
      <table>
        <tr><td class="muted">Tipo anúncio</td><td>${inputs.tipoAnuncio === "premium" ? "Premium" : "Clássico"}</td></tr>
        <tr><td class="muted">Comissão</td><td>${pct(inputs.comissaoPercent)}</td></tr>
        <tr><td class="muted">Forma de envio</td><td>${esc(inputs.formaEnvio)}</td></tr>
        <tr><td class="muted">Categoria taxa fixa</td><td>${esc(inputs.categoriaFixa)}</td></tr>
        <tr><td class="muted">Reputação</td><td>${esc(inputs.reputacao)}</td></tr>
      </table>
    </div>
  </div>

  <div style="height:10px"></div>
  <div class="grid2">
    <div class="card">
      <div class="h">Dimensões e peso</div>
      <table>
        <tr><td class="muted">Peso</td><td>${inputs.peso} kg</td></tr>
        <tr><td class="muted">Dimensões</td><td>${inputs.comprimento}×${inputs.largura}×${inputs.altura} cm</td></tr>
      </table>
    </div>
    <div class="card">
      <div class="h">Marketing</div>
      <table>
        <tr><td class="muted">Modo Ads</td><td>${esc(inputs.modoAds)}</td></tr>
        <tr><td class="muted">ROAS alvo</td><td>x${inputs.roasAlvo.toFixed(1)}</td></tr>
        <tr><td class="muted">TACOS meta</td><td>${pct(inputs.tacosPercent)}</td></tr>
        <tr><td class="muted">Orgânico</td><td>${pct(inputs.proporcaoOrganica)}</td></tr>
      </table>
    </div>
  </div>

  <div style="height:10px"></div>
  <div class="card">
    <div class="h">Resultado (sem lucro)</div>
    <div class="row" style="align-items:flex-end;">
      <div>
        <div class="muted" style="font-size:12px;">Preço para cadastrar no ML</div>
        <div class="big">${result ? brl(result.precoFinal) : "—"}</div>
      </div>
      <div style="text-align:right;">
        <div class="muted" style="font-size:12px;">Preço ao cliente</div>
        <div style="font-size:16px;font-weight:800;">${result ? brl(result.precoCliente) : "—"}</div>
        <div class="muted" style="font-size:12px;">Total custos + taxas</div>
        <div style="font-size:14px;font-weight:800;">${result ? brl(totalCustos) : "—"}</div>
      </div>
    </div>
  </div>
  `;

  return baseDoc("MAPH PRO 3D — Mercado Livre", body);
}

export function buildShopeePrintHtml(args: {
  productName?: string;
  inputs: ShopeeInputs;
  result: ShopeeResult | null;
}) {
  const { productName, inputs, result } = args;
  const body = `
  <div class="row" style="align-items:flex-start;">
    <div>
      <div class="title">MAPH PRO 3D</div>
      <div class="subtitle muted">Calculadora de Precificação · Shopee 2026</div>
      ${productName?.trim() ? `<div class="subtitle">Produto: <b>${esc(productName.trim())}</b></div>` : ""}
    </div>
    <div class="subtitle muted" style="text-align:right;">
      ${esc(new Date().toLocaleString("pt-BR"))}
    </div>
  </div>
  <div class="hr"></div>

  <div class="grid2">
    <div class="card">
      <div class="h">Dados do produto</div>
      <table>
        <tr><td class="muted">Custo 3D / unidade</td><td>${brl(inputs.fullCustoUnidade)}</td></tr>
        <tr><td class="muted">Valor de compra (fallback)</td><td>${brl(inputs.valorCompra)}</td></tr>
        <tr><td class="muted">Custo de envio</td><td>${brl(inputs.custoEnvio)}</td></tr>
        <tr><td class="muted">Kit</td><td>${inputs.isKit ? `Sim (${inputs.kitQtd} un.)` : "Não"}</td></tr>
        <tr><td class="muted">Tributação</td><td>${pct(inputs.tributacaoPercent)}</td></tr>
        <tr><td class="muted">ROAS alvo</td><td>x${inputs.roasAlvo.toFixed(1)}</td></tr>
        <tr><td class="muted">Promoção</td><td>${pct(inputs.promocaoPercent)}</td></tr>
        <tr><td class="muted">Cupom loja</td><td>${pct(inputs.cupomLojaPercent)}</td></tr>
      </table>
    </div>
    <div class="card">
      <div class="h">Configuração Shopee</div>
      <table>
        <tr><td class="muted">Tipo vendedor</td><td>${inputs.tipoVendedor.toUpperCase()}</td></tr>
        <tr><td class="muted">Alta volume (CPF)</td><td>${inputs.altaVolume ? "Sim" : "Não"}</td></tr>
        <tr><td class="muted">Campanhas destaque</td><td>${inputs.campanhasDestaque ? "Ativo" : "Inativo"}</td></tr>
        <tr><td class="muted">Shopee Acelera</td><td>${esc(inputs.shopeeAcelera)}</td></tr>
        <tr><td class="muted">Estimativa mensal</td><td>${inputs.estimativaVendas} vendas</td></tr>
        <tr><td class="muted">Referência mercado</td><td>${brl(inputs.referenciaPrecoMercado)}</td></tr>
      </table>
    </div>
  </div>

  <div style="height:10px"></div>
  <div class="card">
    <div class="h">Resultado (sem lucro)</div>
    <div class="row" style="align-items:flex-end;">
      <div>
        <div class="muted" style="font-size:12px;">Preço para cadastrar na Shopee</div>
        <div class="big">${result ? brl(result.precoCadastroSugerido) : "—"}</div>
      </div>
      <div style="text-align:right;">
        <div class="muted" style="font-size:12px;">Preço final ao cliente</div>
        <div style="font-size:16px;font-weight:800;">${result ? brl(result.precoFinalSugerido) : "—"}</div>
        <div class="muted" style="font-size:12px;">Comissão (estimada)</div>
        <div style="font-size:14px;font-weight:800;">${result ? brl(result.valorComissao) : "—"}</div>
      </div>
    </div>
  </div>
  `;
  return baseDoc("MAPH PRO 3D — Shopee", body);
}

