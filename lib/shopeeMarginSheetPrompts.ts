/** Prompts prontos pra colar em agentes de IA com acesso ao navegador (Claude Cowork, Codex, etc.)
 * que leem a loja Shopee e geram a planilha "Precos e Margem" no formato que esta página importa.
 * Mantidos em texto puro (não alterar o formato descrito no prompt sem também ajustar
 * shopeeMarginSheet.ts, já que o layout da planilha é lido por essa página). */

export const SHOPEE_MARGIN_SHEET_PROMPT_COWORK = `Gere a minha "Planilha Shopee de Preços e Margem" lendo os dados da minha loja na Central do Vendedor da Shopee, que está aberta no meu navegador. Siga estas instruções à risca. A planilha vai ser importada num sistema que lê exatamente este layout, então não mude nada no formato.

REGRAS GERAIS
- Só leitura: não altere, salve, crie ou exclua nada na minha loja. Apenas leia as páginas.
- Use a aba do navegador que já está aberta na Central do Vendedor. Para ler as páginas, prefira ler o texto da página via JavaScript (document.body.innerText) em vez de screenshots.
- Não pergunte nada que dê para descobrir lendo a loja. Pergunte só nos casos indicados abaixo.
- Se precisar guardar dados entre páginas, use localStorage com chaves começando por "__claude_" e apague essas chaves no final.

PASSO 1. COLETAR OS DADOS DA LOJA
1. shop_id: rode no console da página fetch('/api/selleraccount/shop_info/') e pegue o campo shop_id.
2. Produtos: em Meus Produtos > Ativos, liste todos os anúncios com nome, "ID do Item" (item_id), variações e preço de cadastro de cada variação. Percorra todas as páginas da lista e abra "Ver Mais" quando houver variações escondidas.
3. Preço da promoção: em Central de Marketing > Desconto, abra a promoção do tipo "Minha Promoção" que está "Em andamento" > Detalhes. A lista de produtos é paginada: clique em cada página e espere o texto parar de mudar antes de ler. Em cada variação, pegue o "Preço com Desconto". Variações e produtos fora da promoção usam o próprio preço de cadastro como preço de promoção. Se houver mais de uma Minha Promoção em andamento, use a de cada produto. Se não houver nenhuma, use o preço de cadastro em todos e avise na resposta.
4. Preço da oferta relâmpago: em Central de Marketing > Oferta Relâmpago da Loja, abra a oferta em andamento. Se não houver, abra a próxima agendada > Detalhes. Pegue o preço "por valor descontado" de cada variação. Produto ou variação fora da oferta fica sem preço relâmpago (vazio).
5. Cupons: em Central de Marketing > Cupons > Lista de Cupom, use só os cupons do tipo "Cupom da loja", "Em andamento", válidos para "Todos os produtos" e com desconto em valor fixo (R$). Anote o pedido mínimo e o valor de cada um. Ignore cupons exclusivos, de produto, de live, percentuais e expirados, e diga quais ignorou. Se sobrarem mais de 4 cupons, me pergunte quais 4 entram.
6. Valores em R$ na Shopee usam vírgula decimal e ponto de milhar: converta para número (ex.: "R$1.234,56" = 1234.56). Variações esgotadas que não aparecem nas promoções entram com o preço de cadastro.

PASSO 2. AGRUPAR AS LINHAS
- Uma linha por produto + preço de cadastro + preço de promoção + preço relâmpago idênticos. "n" = quantas variações caem no grupo.
- Nome do produto: versão curta e legível do título do anúncio (até uns 60 caracteres), mantendo o que diferencia anúncios parecidos.
- Rótulo da variação: se o grupo tem uma só variação, use o nome dela. Se as variações compartilham um trecho (ex.: um tamanho), use esse trecho com "(todas as cores)" ou "(N cores)". Senão, liste até 4 nomes separados por " / ", ou descreva o grupo (ex.: "Kit com 3").
- Ordene por nome do produto (A–Z), depois por preço de cadastro, depois por preço de promoção.
- Nunca use "|" como separador interno ao agrupar, porque nomes de anúncio podem conter "|".

PASSO 3. GERAR O ARQUIVO
1. Monte um arquivo dados.json neste formato:
{
  "nota_fonte": "Preços lidos da Shopee em DD/MM/AAAA: cadastro, promoção '<nome da Minha Promoção>' e oferta relâmpago de DD/MM.",
  "nota_cupons": "Fonte: Meus Cupons de Vendedor em DD/MM/AAAA. <cupons ignorados e por quê>",
  "shop_id": 0,
  "parametros": {"comissao": 0.20, "transacao": 0.02, "imposto": 0.05, "taxa_fixa": 4.50, "margem_alvo": 0.20},
  "cupons": [[15.99, 1, "R$1 OFF acima de R$15,99"]],
  "linhas": [{"produto": "...", "variacao": "...", "n": 1, "cadastro": 0.0, "promocao": 0.0, "relampago": null, "item_id": 0}]
}
   "cupons" vem em ordem crescente de pedido mínimo, sem a linha "sem cupom". "relampago" = null quando não há oferta relâmpago para aquela linha. Se eu informar minhas taxas ou minha margem alvo, use os meus valores em "parametros". Senão, use os padrões acima.
2. Salve o script Python abaixo como gerar_planilha.py, sem alterar nada, e rode:
   python3 gerar_planilha.py dados.json precos_e_margem_shopee.xlsx
3. Recalcule as fórmulas (por exemplo, abrindo e salvando com LibreOffice em modo headless) e confira que não há nenhum erro de fórmula.
4. Teste numa cópia: preencha custo 6 e embalagem 2 em uma linha e confira na mão "Cliente paga", "Taxas", "Lucro" e "Margem %".
5. Abra um dos links da coluna W e confira se cai no anúncio certo.
6. Me entregue o arquivo precos_e_margem_shopee.xlsx. Na resposta, diga em poucas linhas quantos produtos e variações entraram, que as taxas da aba Parametros são premissas para eu conferir no painel, e liste só o que pede atenção: linhas com Alerta, produtos sem Minha Promoção, cupons ignorados.

FORMATO FIXO (não altere)
- Aba "Precos e Margem" (primeira e ativa) e aba "Parametros".
- "Precos e Margem": título na linha 1, instrução na linha 2, faixas de grupo na linha 3, cabeçalho na linha 4, dados a partir da linha 5. Colunas: A Produto, B Variação(ões), C Nº var., D Preço cadastro, E Preço promoção (rede), F Cupom loja, G Cliente paga (sem relâmpago), H Desconto real vs cadastro, I Preço relâmpago, J Cupom loja, K Cliente paga (com relâmpago), L Custo produção (R$/un), M Embalagem + outros (R$/un), N Taxas Shopee + imposto, O Lucro (R$), P Margem %, Q Taxas Shopee + imposto, R Lucro (R$), S Margem %, T Cliente deve pagar p/ margem alvo, U Preço promoção p/ margem alvo, V Alerta, W Link do anúncio.
- "Parametros": B4 comissão, B5 transação, B6 imposto, B7 taxa fixa, B8 margem alvo. Tabela de cupons em A13:B17 com 5 linhas fixas (a primeira é sempre 0/0 "Sem cupom").
- O script já gera tudo isso. Não monte a planilha à mão e não edite o script.

SCRIPT (gerar_planilha.py)
\`\`\`python
#!/usr/bin/env python3
"""Gera a planilha 'Precos e Margem' da Shopee no formato fixo (lido pelo SaaS).
Uso: python3 gerar_planilha.py dados.json saida.xlsx
"""
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import FormulaRule

dados = json.load(open(sys.argv[1], encoding="utf-8"))
saida = sys.argv[2]
R = dados["linhas"]          # lista de {produto, variacao, n, cadastro, promocao, relampago(null), item_id}
par = dados.get("parametros", {})
cupons = dados["cupons"]     # lista de [pedido_minimo, desconto, descricao], SEM a linha "Sem cupom"
assert len(cupons) <= 4, "Formato fixo comporta no máximo 4 cupons (linhas 14 a 17)"
while len(cupons) < 4:       # completa repetindo o último para manter A13:B17
    cupons.append(cupons[-1] if cupons else [0, 0, "Sem cupom"])
cupons = [[0, 0, "Sem cupom"]] + cupons

def brl(x): return ("R$%.2f" % x).replace(".", ",")
def cupom(x):
    v = 0
    for m, d, _ in cupons:
        if x >= m: v = d
    return v

F = "Arial"
font = Font(name=F, size=10); bold = Font(name=F, size=10, bold=True); white = Font(name=F, size=10, bold=True, color="FFFFFF")
blue = Font(name=F, size=10, color="0000FF")
yellow = PatternFill("solid", fgColor="FFF2CC"); hdr = PatternFill("solid", fgColor="1F3864")
g1 = PatternFill("solid", fgColor="DDEBF7"); g2 = PatternFill("solid", fgColor="E2EFDA"); g3 = PatternFill("solid", fgColor="FCE4D6")
thin = Side(style="thin", color="BFBFBF"); bd = Border(left=thin, right=thin, top=thin, bottom=thin)
BRL = '"R$" #,##0.00;-"R$" #,##0.00;"-"'; PCT = '0.0%;-0.0%;"-"'

wb = Workbook()
ps = wb.active; ps.title = "Parametros"
ps["A1"] = "Parâmetros de taxas e cupons"; ps["A1"].font = Font(name=F, size=13, bold=True)
ps["A2"] = "Células amarelas são editáveis. Confira as taxas na sua Central do Vendedor, a Shopee reajusta de tempos em tempos."; ps["A2"].font = Font(name=F, size=9, italic=True)
rows = [("Comissão Shopee (% do preço final)", par.get("comissao", 0.20), PCT, "Premissa da skill de precificação (~20%). Confirme no painel."),
        ("Taxa de transação (%)", par.get("transacao", 0.02), PCT, "Premissa (~2%)."),
        ("Imposto / tributação (%)", par.get("imposto", 0.05), PCT, "Premissa (~5%). Ajuste para a sua alíquota."),
        ("Taxa fixa por venda (R$)", par.get("taxa_fixa", 4.50), BRL, "Premissa (~R$4,50 por item vendido)."),
        ("Margem alvo (% do preço final)", par.get("margem_alvo", 0.20), PCT, "Defina a margem que você quer. Usada na coluna 'Preço final p/ margem alvo'.")]
for i, (lab, v, fmt, note) in enumerate(rows, start=4):
    ps.cell(i, 1, lab).font = font; c = ps.cell(i, 2, v); c.font = blue; c.fill = yellow; c.number_format = fmt; c.border = bd
    ps.cell(i, 3, note).font = Font(name=F, size=9, color="595959")
ps["A11"] = "Cupons de loja ativos (aplicados em 1 unidade)"; ps["A11"].font = bold
ps["A12"] = "Pedido mínimo (R$)"; ps["B12"] = "Desconto (R$)"; ps["C12"] = "Cupom"
for c in ("A12", "B12", "C12"): ps[c].font = white; ps[c].fill = hdr
for i, (m, d, n) in enumerate(cupons, start=13):
    a = ps.cell(i, 1, m); a.number_format = BRL; a.font = blue; a.fill = yellow; a.border = bd
    b = ps.cell(i, 2, d); b.number_format = BRL; b.font = blue; b.fill = yellow; b.border = bd
    ps.cell(i, 3, n).font = font
ps["A19"] = dados.get("nota_cupons", "Fonte: Meus Cupons de Vendedor."); ps["A19"].font = Font(name=F, size=9, italic=True)
ps.column_dimensions["A"].width = 40; ps.column_dimensions["B"].width = 16; ps.column_dimensions["C"].width = 70

ws = wb.create_sheet("Precos e Margem"); wb.move_sheet(ws, -1)
ws["A1"] = "Preço final ao cliente e margem por produto (1 unidade)"; ws["A1"].font = Font(name=F, size=13, bold=True)
ws["A2"] = ("Como usar: preencha as colunas amarelas (custo de produção e embalagem/outros) por linha. "
            "Variações com o mesmo preço estão agrupadas em uma linha. " + dados.get("nota_fonte", ""))
ws["A2"].font = Font(name=F, size=9, italic=True); ws.merge_cells("A2:V2"); ws["A2"].alignment = Alignment(wrap_text=True); ws.row_dimensions[2].height = 28
groups = [("A3:D3", "PRODUTO", hdr), ("E3:H3", "SEM RELÂMPAGO (rede de proteção)", g1), ("I3:K3", "COM RELÂMPAGO", g2),
          ("L3:M3", "CUSTOS (preencher)", yellow), ("N3:P3", "RESULTADO SEM RELÂMPAGO", g1), ("Q3:S3", "RESULTADO COM RELÂMPAGO", g2), ("T3:V3", "AJUSTE DE PREÇO", g3)]
ws["W3"] = "ANÚNCIO"; ws["W3"].font = white; ws["W3"].fill = hdr; ws["W3"].alignment = Alignment(horizontal="center")
for rng, t, fill in groups:
    ws.merge_cells(rng); c = ws[rng.split(":")[0]]; c.value = t; c.font = bold if fill != hdr else white; c.fill = fill; c.alignment = Alignment(horizontal="center")
H = ["Produto", "Variação(ões)", "Nº var.", "Preço cadastro", "Preço promoção (rede)", "Cupom loja", "Cliente paga (sem relâmpago)", "Desconto real vs cadastro",
     "Preço relâmpago", "Cupom loja", "Cliente paga (com relâmpago)",
     "Custo produção (R$/un)", "Embalagem + outros (R$/un)",
     "Taxas Shopee + imposto", "Lucro (R$)", "Margem %",
     "Taxas Shopee + imposto", "Lucro (R$)", "Margem %",
     "Cliente deve pagar p/ margem alvo", "Preço promoção p/ margem alvo", "Alerta", "Link do anúncio"]
for j, h in enumerate(H, start=1):
    c = ws.cell(4, j, h); c.font = white; c.fill = hdr; c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center"); c.border = bd
ws.row_dimensions[4].height = 42
P_ = "Parametros!"
taxa = f"({P_}$B$4+{P_}$B$5+{P_}$B$6)"; fixa = f"{P_}$B$7"; alvo = f"{P_}$B$8"
cupL = f"{P_}$A$13:$A$17"; cupV = f"{P_}$B$13:$B$17"
start = 5
for i, x in enumerate(R):
    r = start + i
    vals = {1: x["produto"], 2: x["variacao"], 3: x["n"], 4: x["cadastro"], 5: x["promocao"], 9: x.get("relampago")}
    for j, v in vals.items(): ws.cell(r, j, v)
    ws.cell(r, 6, f"=LOOKUP(E{r},{cupL},{cupV})")
    ws.cell(r, 7, f"=E{r}-F{r}")
    ws.cell(r, 8, f"=IF(D{r}>0,1-G{r}/D{r},0)")
    ws.cell(r, 10, f'=IF(I{r}="","",LOOKUP(I{r},{cupL},{cupV}))')
    ws.cell(r, 11, f'=IF(I{r}="","",I{r}-J{r})')
    for j in (12, 13): c = ws.cell(r, j); c.fill = yellow
    ws.cell(r, 14, f"=G{r}*{taxa}+{fixa}")
    ws.cell(r, 15, f'=IF(L{r}="","",G{r}-N{r}-L{r}-M{r})')
    ws.cell(r, 16, f'=IF(O{r}="","",O{r}/G{r})')
    ws.cell(r, 17, f'=IF(K{r}="","",K{r}*{taxa}+{fixa})')
    ws.cell(r, 18, f'=IF(OR(K{r}="",L{r}=""),"",K{r}-Q{r}-L{r}-M{r})')
    ws.cell(r, 19, f'=IF(R{r}="","",R{r}/K{r})')
    ws.cell(r, 20, f'=IF(L{r}="","",(L{r}+M{r}+{fixa})/(1-{taxa}-{alvo}))')
    ws.cell(r, 21, f'=IF(T{r}="","",T{r}+LOOKUP(T{r}+LOOKUP(T{r},{cupL},{cupV}),{cupL},{cupV}))')
    ws.cell(r, 22, f'=IF(AND(I{r}<>"",I{r}>=E{r}),"Relâmpago mais caro que a promoção",IF(AND(U{r}<>"",U{r}>D{r}),"Margem alvo exige preço acima do cadastro",""))')
    shop = dados["shop_id"]; url = f"https://shopee.com.br/product/{shop}/{x['item_id']}"
    lk = ws.cell(r, 23, url); lk.hyperlink = url; lk.font = Font(name=F, size=9, color="0563C1", underline="single"); lk.border = bd
    for j in range(1, 23):
        c = ws.cell(r, j); c.border = bd
        if j in (4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21): c.number_format = BRL
        if j in (8, 16, 19): c.number_format = PCT
        c.font = blue if j in (4, 5, 9, 12, 13) else (Font(name=F, size=9, color="C00000") if j == 22 else font)
end = start + len(R) - 1
red = Font(name=F, size=10, color="C00000", bold=True)
for col in ("P", "S"):
    ws.conditional_formatting.add(f"{col}{start}:{col}{end}", FormulaRule(formula=[f'AND({col}{start}<>"",{col}{start}<0)'], font=red, fill=PatternFill("solid", fgColor="F8CBAD")))
    ws.conditional_formatting.add(f"{col}{start}:{col}{end}", FormulaRule(formula=[f'AND({col}{start}<>"",{col}{start}>=0,{col}{start}<{alvo})'], fill=PatternFill("solid", fgColor="FFE699")))
    ws.conditional_formatting.add(f"{col}{start}:{col}{end}", FormulaRule(formula=[f'AND({col}{start}<>"",{col}{start}>={alvo})'], fill=PatternFill("solid", fgColor="C6EFCE")))
# exemplo da legenda calculado a partir da 1ª linha, com custo 6,00 e embalagem 2,00
x0 = R[0]; t = par.get("comissao", .20) + par.get("transacao", .02) + par.get("imposto", .05); fx = par.get("taxa_fixa", 4.5)
g = round(x0["promocao"] - cupom(x0["promocao"]), 2); tx = round(g * t + fx, 2); lu = round(g - tx - 8, 2)
lr = end + 2
notes = ["Legenda:",
         "• Amarelo = você preenche (custo por unidade). Azul = preço lido da Shopee (pode editar para simular).",
         "• Cupom loja: o maior cupom que o cliente consegue levando 1 unidade, pela tabela da aba Parametros.",
         "• Taxas = (comissão + transação + imposto) × valor que o cliente paga + taxa fixa por venda. Edite os percentuais na aba Parametros.",
         "• Margem %: verde = atinge a margem alvo; amarelo = lucro positivo abaixo da meta; vermelho = prejuízo.",
         "• 'Preço promoção p/ margem alvo' já soma o cupom que o cliente vai usar naquele valor; é o preço que você colocaria na Minha Promoção.",
         "• Se o valor ficar acima do preço de cadastro, suba o cadastro também, mantendo a proporção máx. de 4x entre variações do mesmo anúncio.",
         f"• Exemplo: {x0['produto']} ({x0['variacao']}) com custo R$6,00 e embalagem R$2,00 → cliente paga {brl(g)} sem relâmpago, taxas {brl(tx)}, lucro {brl(lu)} ({round(100*lu/g)}%)."]
for k, tx_ in enumerate(notes):
    c = ws.cell(lr + k, 1, tx_); c.font = bold if k == 0 else Font(name=F, size=9)
widths = [40, 38, 7, 12, 13, 9, 14, 12, 12, 9, 14, 13, 13, 13, 11, 9, 13, 11, 9, 15, 15, 30, 52]
for j, w in enumerate(widths, start=1): ws.column_dimensions[get_column_letter(j)].width = w
ws.freeze_panes = "C5"; ws.auto_filter.ref = f"A4:W{end}"
wb.active = wb.index(ws)
wb.save(saida)
print("ok", len(R), "linhas;", sum(x["n"] for x in R), "variações")
\`\`\`
`;

/** Prompt pro modo Agente do ChatGPT (navegador controlado pelo agente, login manual pelo usuário). */
export const SHOPEE_MARGIN_SHEET_PROMPT_AGENT: string = "Use o modo Agente com o navegador. Gere a minha \"Planilha Shopee de Preços e Margem\" lendo os dados da minha loja na Central do Vendedor da Shopee (seller.shopee.com.br). Siga estas instruções à risca. A planilha vai ser importada num sistema que lê exatamente este layout, então não mude nada no formato.\n\nLOGIN\n- Abra seller.shopee.com.br no seu navegador. Quando aparecer a tela de login ou de verificação, pare e me peça para assumir o controle. Eu faço o login e devolvo o controle para você. Nunca peça nem digite minha senha ou código de verificação.\n\nREGRAS GERAIS\n- Só leitura: não altere, salve, crie ou exclua nada na minha loja. Apenas leia as páginas.\n- Leia o texto das páginas pelo navegador. Role até o fim de cada lista para garantir que tudo carregou, e abra \"Ver Mais\" quando houver variações escondidas.\n- Não pergunte nada que dê para descobrir lendo a loja. Pergunte só nos casos indicados abaixo.\n- Se precisar guardar dados entre páginas, use localStorage com chaves começando por \"__claude_\" e apague essas chaves no final.\n\nPASSO 1. COLETAR OS DADOS DA LOJA\n1. shop_id: abra no navegador o endereço https://seller.shopee.com.br/api/selleraccount/shop_info/ (já logado) e pegue o campo shop_id do texto que aparece.\n2. Produtos: em Meus Produtos > Ativos, liste todos os anúncios com nome, \"ID do Item\" (item_id), variações e preço de cadastro de cada variação. Percorra todas as páginas da lista e abra \"Ver Mais\" quando houver variações escondidas.\n3. Preço da promoção: em Central de Marketing > Desconto, abra a promoção do tipo \"Minha Promoção\" que está \"Em andamento\" > Detalhes. A lista de produtos é paginada: clique em cada página e espere o texto parar de mudar antes de ler. Em cada variação, pegue o \"Preço com Desconto\". Variações e produtos fora da promoção usam o próprio preço de cadastro como preço de promoção. Se houver mais de uma Minha Promoção em andamento, use a de cada produto. Se não houver nenhuma, use o preço de cadastro em todos e avise na resposta.\n4. Preço da oferta relâmpago: em Central de Marketing > Oferta Relâmpago da Loja, abra a oferta em andamento. Se não houver, abra a próxima agendada > Detalhes. Pegue o preço \"por valor descontado\" de cada variação. Produto ou variação fora da oferta fica sem preço relâmpago (vazio).\n5. Cupons: em Central de Marketing > Cupons > Lista de Cupom, use só os cupons do tipo \"Cupom da loja\", \"Em andamento\", válidos para \"Todos os produtos\" e com desconto em valor fixo (R$). Anote o pedido mínimo e o valor de cada um. Ignore cupons exclusivos, de produto, de live, percentuais e expirados, e diga quais ignorou. Se sobrarem mais de 4 cupons, me pergunte quais 4 entram.\n6. Valores em R$ na Shopee usam vírgula decimal e ponto de milhar: converta para número (ex.: \"R$1.234,56\" = 1234.56). Variações esgotadas que não aparecem nas promoções entram com o preço de cadastro.\n\nPASSO 2. AGRUPAR AS LINHAS\n- Uma linha por produto + preço de cadastro + preço de promoção + preço relâmpago idênticos. \"n\" = quantas variações caem no grupo.\n- Nome do produto: versão curta e legível do título do anúncio (até uns 60 caracteres), mantendo o que diferencia anúncios parecidos.\n- Rótulo da variação: se o grupo tem uma só variação, use o nome dela. Se as variações compartilham um trecho (ex.: um tamanho), use esse trecho com \"(todas as cores)\" ou \"(N cores)\". Senão, liste até 4 nomes separados por \" / \", ou descreva o grupo (ex.: \"Kit com 3\").\n- Ordene por nome do produto (A–Z), depois por preço de cadastro, depois por preço de promoção.\n- Nunca use \"|\" como separador interno ao agrupar, porque nomes de anúncio podem conter \"|\".\n\nPASSO 3. GERAR O ARQUIVO\n1. Monte um arquivo dados.json neste formato:\n{\n  \"nota_fonte\": \"Preços lidos da Shopee em DD/MM/AAAA: cadastro, promoção '<nome da Minha Promoção>' e oferta relâmpago de DD/MM.\",\n  \"nota_cupons\": \"Fonte: Meus Cupons de Vendedor em DD/MM/AAAA. <cupons ignorados e por quê>\",\n  \"shop_id\": 0,\n  \"parametros\": {\"comissao\": 0.20, \"transacao\": 0.02, \"imposto\": 0.05, \"taxa_fixa\": 4.50, \"margem_alvo\": 0.20},\n  \"cupons\": [[15.99, 1, \"R$1 OFF acima de R$15,99\"]],\n  \"linhas\": [{\"produto\": \"...\", \"variacao\": \"...\", \"n\": 1, \"cadastro\": 0.0, \"promocao\": 0.0, \"relampago\": null, \"item_id\": 0}]\n}\n   \"cupons\" vem em ordem crescente de pedido mínimo, sem a linha \"sem cupom\". \"relampago\" = null quando não há oferta relâmpago para aquela linha. Se eu informar minhas taxas ou minha margem alvo, use os meus valores em \"parametros\". Senão, use os padrões acima.\n2. No seu terminal, salve o script Python abaixo como gerar_planilha.py, sem alterar nada, instale o openpyxl se faltar, e rode:\n   python3 gerar_planilha.py dados.json precos_e_margem_shopee.xlsx\n3. Recalcule as fórmulas (por exemplo, abrindo e salvando com LibreOffice em modo headless) e confira que não há nenhum erro de fórmula.\n4. Teste numa cópia: preencha custo 6 e embalagem 2 em uma linha e confira na mão \"Cliente paga\", \"Taxas\", \"Lucro\" e \"Margem %\".\n5. Abra um dos links da coluna W e confira se cai no anúncio certo.\n6. Me entregue o arquivo precos_e_margem_shopee.xlsx para download. Na resposta, diga em poucas linhas quantos produtos e variações entraram, que as taxas da aba Parametros são premissas para eu conferir no painel, e liste só o que pede atenção: linhas com Alerta, produtos sem Minha Promoção, cupons ignorados.\n\nFORMATO FIXO (não altere)\n- Aba \"Precos e Margem\" (primeira e ativa) e aba \"Parametros\".\n- \"Precos e Margem\": título na linha 1, instrução na linha 2, faixas de grupo na linha 3, cabeçalho na linha 4, dados a partir da linha 5. Colunas: A Produto, B Variação(ões), C Nº var., D Preço cadastro, E Preço promoção (rede), F Cupom loja, G Cliente paga (sem relâmpago), H Desconto real vs cadastro, I Preço relâmpago, J Cupom loja, K Cliente paga (com relâmpago), L Custo produção (R$/un), M Embalagem + outros (R$/un), N Taxas Shopee + imposto, O Lucro (R$), P Margem %, Q Taxas Shopee + imposto, R Lucro (R$), S Margem %, T Cliente deve pagar p/ margem alvo, U Preço promoção p/ margem alvo, V Alerta, W Link do anúncio.\n- \"Parametros\": B4 comissão, B5 transação, B6 imposto, B7 taxa fixa, B8 margem alvo. Tabela de cupons em A13:B17 com 5 linhas fixas (a primeira é sempre 0/0 \"Sem cupom\").\n- O script já gera tudo isso. Não monte a planilha à mão e não edite o script.\n\nSCRIPT (gerar_planilha.py)\n```python\n#!/usr/bin/env python3\n\"\"\"Gera a planilha 'Precos e Margem' da Shopee no formato fixo (lido pelo SaaS).\nUso: python3 gerar_planilha.py dados.json saida.xlsx\n\"\"\"\nimport json, sys\nfrom openpyxl import Workbook\nfrom openpyxl.styles import Font, PatternFill, Alignment, Border, Side\nfrom openpyxl.utils import get_column_letter\nfrom openpyxl.formatting.rule import FormulaRule\n\ndados = json.load(open(sys.argv[1], encoding=\"utf-8\"))\nsaida = sys.argv[2]\nR = dados[\"linhas\"]          # lista de {produto, variacao, n, cadastro, promocao, relampago(null), item_id}\npar = dados.get(\"parametros\", {})\ncupons = dados[\"cupons\"]     # lista de [pedido_minimo, desconto, descricao], SEM a linha \"Sem cupom\"\nassert len(cupons) <= 4, \"Formato fixo comporta no máximo 4 cupons (linhas 14 a 17)\"\nwhile len(cupons) < 4:       # completa repetindo o último para manter A13:B17\n    cupons.append(cupons[-1] if cupons else [0, 0, \"Sem cupom\"])\ncupons = [[0, 0, \"Sem cupom\"]] + cupons\n\ndef brl(x): return (\"R$%.2f\" % x).replace(\".\", \",\")\ndef cupom(x):\n    v = 0\n    for m, d, _ in cupons:\n        if x >= m: v = d\n    return v\n\nF = \"Arial\"\nfont = Font(name=F, size=10); bold = Font(name=F, size=10, bold=True); white = Font(name=F, size=10, bold=True, color=\"FFFFFF\")\nblue = Font(name=F, size=10, color=\"0000FF\")\nyellow = PatternFill(\"solid\", fgColor=\"FFF2CC\"); hdr = PatternFill(\"solid\", fgColor=\"1F3864\")\ng1 = PatternFill(\"solid\", fgColor=\"DDEBF7\"); g2 = PatternFill(\"solid\", fgColor=\"E2EFDA\"); g3 = PatternFill(\"solid\", fgColor=\"FCE4D6\")\nthin = Side(style=\"thin\", color=\"BFBFBF\"); bd = Border(left=thin, right=thin, top=thin, bottom=thin)\nBRL = '\"R$\" #,##0.00;-\"R$\" #,##0.00;\"-\"'; PCT = '0.0%;-0.0%;\"-\"'\n\nwb = Workbook()\nps = wb.active; ps.title = \"Parametros\"\nps[\"A1\"] = \"Parâmetros de taxas e cupons\"; ps[\"A1\"].font = Font(name=F, size=13, bold=True)\nps[\"A2\"] = \"Células amarelas são editáveis. Confira as taxas na sua Central do Vendedor, a Shopee reajusta de tempos em tempos.\"; ps[\"A2\"].font = Font(name=F, size=9, italic=True)\nrows = [(\"Comissão Shopee (% do preço final)\", par.get(\"comissao\", 0.20), PCT, \"Premissa da skill de precificação (~20%). Confirme no painel.\"),\n        (\"Taxa de transação (%)\", par.get(\"transacao\", 0.02), PCT, \"Premissa (~2%).\"),\n        (\"Imposto / tributação (%)\", par.get(\"imposto\", 0.05), PCT, \"Premissa (~5%). Ajuste para a sua alíquota.\"),\n        (\"Taxa fixa por venda (R$)\", par.get(\"taxa_fixa\", 4.50), BRL, \"Premissa (~R$4,50 por item vendido).\"),\n        (\"Margem alvo (% do preço final)\", par.get(\"margem_alvo\", 0.20), PCT, \"Defina a margem que você quer. Usada na coluna 'Preço final p/ margem alvo'.\")]\nfor i, (lab, v, fmt, note) in enumerate(rows, start=4):\n    ps.cell(i, 1, lab).font = font; c = ps.cell(i, 2, v); c.font = blue; c.fill = yellow; c.number_format = fmt; c.border = bd\n    ps.cell(i, 3, note).font = Font(name=F, size=9, color=\"595959\")\nps[\"A11\"] = \"Cupons de loja ativos (aplicados em 1 unidade)\"; ps[\"A11\"].font = bold\nps[\"A12\"] = \"Pedido mínimo (R$)\"; ps[\"B12\"] = \"Desconto (R$)\"; ps[\"C12\"] = \"Cupom\"\nfor c in (\"A12\", \"B12\", \"C12\"): ps[c].font = white; ps[c].fill = hdr\nfor i, (m, d, n) in enumerate(cupons, start=13):\n    a = ps.cell(i, 1, m); a.number_format = BRL; a.font = blue; a.fill = yellow; a.border = bd\n    b = ps.cell(i, 2, d); b.number_format = BRL; b.font = blue; b.fill = yellow; b.border = bd\n    ps.cell(i, 3, n).font = font\nps[\"A19\"] = dados.get(\"nota_cupons\", \"Fonte: Meus Cupons de Vendedor.\"); ps[\"A19\"].font = Font(name=F, size=9, italic=True)\nps.column_dimensions[\"A\"].width = 40; ps.column_dimensions[\"B\"].width = 16; ps.column_dimensions[\"C\"].width = 70\n\nws = wb.create_sheet(\"Precos e Margem\"); wb.move_sheet(ws, -1)\nws[\"A1\"] = \"Preço final ao cliente e margem por produto (1 unidade)\"; ws[\"A1\"].font = Font(name=F, size=13, bold=True)\nws[\"A2\"] = (\"Como usar: preencha as colunas amarelas (custo de produção e embalagem/outros) por linha. \"\n            \"Variações com o mesmo preço estão agrupadas em uma linha. \" + dados.get(\"nota_fonte\", \"\"))\nws[\"A2\"].font = Font(name=F, size=9, italic=True); ws.merge_cells(\"A2:V2\"); ws[\"A2\"].alignment = Alignment(wrap_text=True); ws.row_dimensions[2].height = 28\ngroups = [(\"A3:D3\", \"PRODUTO\", hdr), (\"E3:H3\", \"SEM RELÂMPAGO (rede de proteção)\", g1), (\"I3:K3\", \"COM RELÂMPAGO\", g2),\n          (\"L3:M3\", \"CUSTOS (preencher)\", yellow), (\"N3:P3\", \"RESULTADO SEM RELÂMPAGO\", g1), (\"Q3:S3\", \"RESULTADO COM RELÂMPAGO\", g2), (\"T3:V3\", \"AJUSTE DE PREÇO\", g3)]\nws[\"W3\"] = \"ANÚNCIO\"; ws[\"W3\"].font = white; ws[\"W3\"].fill = hdr; ws[\"W3\"].alignment = Alignment(horizontal=\"center\")\nfor rng, t, fill in groups:\n    ws.merge_cells(rng); c = ws[rng.split(\":\")[0]]; c.value = t; c.font = bold if fill != hdr else white; c.fill = fill; c.alignment = Alignment(horizontal=\"center\")\nH = [\"Produto\", \"Variação(ões)\", \"Nº var.\", \"Preço cadastro\", \"Preço promoção (rede)\", \"Cupom loja\", \"Cliente paga (sem relâmpago)\", \"Desconto real vs cadastro\",\n     \"Preço relâmpago\", \"Cupom loja\", \"Cliente paga (com relâmpago)\",\n     \"Custo produção (R$/un)\", \"Embalagem + outros (R$/un)\",\n     \"Taxas Shopee + imposto\", \"Lucro (R$)\", \"Margem %\",\n     \"Taxas Shopee + imposto\", \"Lucro (R$)\", \"Margem %\",\n     \"Cliente deve pagar p/ margem alvo\", \"Preço promoção p/ margem alvo\", \"Alerta\", \"Link do anúncio\"]\nfor j, h in enumerate(H, start=1):\n    c = ws.cell(4, j, h); c.font = white; c.fill = hdr; c.alignment = Alignment(wrap_text=True, horizontal=\"center\", vertical=\"center\"); c.border = bd\nws.row_dimensions[4].height = 42\nP_ = \"Parametros!\"\ntaxa = f\"({P_}$B$4+{P_}$B$5+{P_}$B$6)\"; fixa = f\"{P_}$B$7\"; alvo = f\"{P_}$B$8\"\ncupL = f\"{P_}$A$13:$A$17\"; cupV = f\"{P_}$B$13:$B$17\"\nstart = 5\nfor i, x in enumerate(R):\n    r = start + i\n    vals = {1: x[\"produto\"], 2: x[\"variacao\"], 3: x[\"n\"], 4: x[\"cadastro\"], 5: x[\"promocao\"], 9: x.get(\"relampago\")}\n    for j, v in vals.items(): ws.cell(r, j, v)\n    ws.cell(r, 6, f\"=LOOKUP(E{r},{cupL},{cupV})\")\n    ws.cell(r, 7, f\"=E{r}-F{r}\")\n    ws.cell(r, 8, f\"=IF(D{r}>0,1-G{r}/D{r},0)\")\n    ws.cell(r, 10, f'=IF(I{r}=\"\",\"\",LOOKUP(I{r},{cupL},{cupV}))')\n    ws.cell(r, 11, f'=IF(I{r}=\"\",\"\",I{r}-J{r})')\n    for j in (12, 13): c = ws.cell(r, j); c.fill = yellow\n    ws.cell(r, 14, f\"=G{r}*{taxa}+{fixa}\")\n    ws.cell(r, 15, f'=IF(L{r}=\"\",\"\",G{r}-N{r}-L{r}-M{r})')\n    ws.cell(r, 16, f'=IF(O{r}=\"\",\"\",O{r}/G{r})')\n    ws.cell(r, 17, f'=IF(K{r}=\"\",\"\",K{r}*{taxa}+{fixa})')\n    ws.cell(r, 18, f'=IF(OR(K{r}=\"\",L{r}=\"\"),\"\",K{r}-Q{r}-L{r}-M{r})')\n    ws.cell(r, 19, f'=IF(R{r}=\"\",\"\",R{r}/K{r})')\n    ws.cell(r, 20, f'=IF(L{r}=\"\",\"\",(L{r}+M{r}+{fixa})/(1-{taxa}-{alvo}))')\n    ws.cell(r, 21, f'=IF(T{r}=\"\",\"\",T{r}+LOOKUP(T{r}+LOOKUP(T{r},{cupL},{cupV}),{cupL},{cupV}))')\n    ws.cell(r, 22, f'=IF(AND(I{r}<>\"\",I{r}>=E{r}),\"Relâmpago mais caro que a promoção\",IF(AND(U{r}<>\"\",U{r}>D{r}),\"Margem alvo exige preço acima do cadastro\",\"\"))')\n    shop = dados[\"shop_id\"]; url = f\"https://shopee.com.br/product/{shop}/{x['item_id']}\"\n    lk = ws.cell(r, 23, url); lk.hyperlink = url; lk.font = Font(name=F, size=9, color=\"0563C1\", underline=\"single\"); lk.border = bd\n    for j in range(1, 23):\n        c = ws.cell(r, j); c.border = bd\n        if j in (4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 20, 21): c.number_format = BRL\n        if j in (8, 16, 19): c.number_format = PCT\n        c.font = blue if j in (4, 5, 9, 12, 13) else (Font(name=F, size=9, color=\"C00000\") if j == 22 else font)\nend = start + len(R) - 1\nred = Font(name=F, size=10, color=\"C00000\", bold=True)\nfor col in (\"P\", \"S\"):\n    ws.conditional_formatting.add(f\"{col}{start}:{col}{end}\", FormulaRule(formula=[f'AND({col}{start}<>\"\",{col}{start}<0)'], font=red, fill=PatternFill(\"solid\", fgColor=\"F8CBAD\")))\n    ws.conditional_formatting.add(f\"{col}{start}:{col}{end}\", FormulaRule(formula=[f'AND({col}{start}<>\"\",{col}{start}>=0,{col}{start}<{alvo})'], fill=PatternFill(\"solid\", fgColor=\"FFE699\")))\n    ws.conditional_formatting.add(f\"{col}{start}:{col}{end}\", FormulaRule(formula=[f'AND({col}{start}<>\"\",{col}{start}>={alvo})'], fill=PatternFill(\"solid\", fgColor=\"C6EFCE\")))\n# exemplo da legenda calculado a partir da 1ª linha, com custo 6,00 e embalagem 2,00\nx0 = R[0]; t = par.get(\"comissao\", .20) + par.get(\"transacao\", .02) + par.get(\"imposto\", .05); fx = par.get(\"taxa_fixa\", 4.5)\ng = round(x0[\"promocao\"] - cupom(x0[\"promocao\"]), 2); tx = round(g * t + fx, 2); lu = round(g - tx - 8, 2)\nlr = end + 2\nnotes = [\"Legenda:\",\n         \"• Amarelo = você preenche (custo por unidade). Azul = preço lido da Shopee (pode editar para simular).\",\n         \"• Cupom loja: o maior cupom que o cliente consegue levando 1 unidade, pela tabela da aba Parametros.\",\n         \"• Taxas = (comissão + transação + imposto) × valor que o cliente paga + taxa fixa por venda. Edite os percentuais na aba Parametros.\",\n         \"• Margem %: verde = atinge a margem alvo; amarelo = lucro positivo abaixo da meta; vermelho = prejuízo.\",\n         \"• 'Preço promoção p/ margem alvo' já soma o cupom que o cliente vai usar naquele valor; é o preço que você colocaria na Minha Promoção.\",\n         \"• Se o valor ficar acima do preço de cadastro, suba o cadastro também, mantendo a proporção máx. de 4x entre variações do mesmo anúncio.\",\n         f\"• Exemplo: {x0['produto']} ({x0['variacao']}) com custo R$6,00 e embalagem R$2,00 → cliente paga {brl(g)} sem relâmpago, taxas {brl(tx)}, lucro {brl(lu)} ({round(100*lu/g)}%).\"]\nfor k, tx_ in enumerate(notes):\n    c = ws.cell(lr + k, 1, tx_); c.font = bold if k == 0 else Font(name=F, size=9)\nwidths = [40, 38, 7, 12, 13, 9, 14, 12, 12, 9, 14, 13, 13, 13, 11, 9, 13, 11, 9, 15, 15, 30, 52]\nfor j, w in enumerate(widths, start=1): ws.column_dimensions[get_column_letter(j)].width = w\nws.freeze_panes = \"C5\"; ws.auto_filter.ref = f\"A4:W{end}\"\nwb.active = wb.index(ws)\nwb.save(saida)\nprint(\"ok\", len(R), \"linhas;\", sum(x[\"n\"] for x in R), \"variações\")\n```\n";
