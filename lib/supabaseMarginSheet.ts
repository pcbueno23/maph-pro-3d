import { supabase } from "./supabaseClient";
import type { MarginRow, MarginParams } from "./shopeeMarginSheet";
import { DEFAULT_MARGIN_PARAMS } from "./shopeeMarginSheet";

export async function fetchMarginRows(userId: string): Promise<MarginRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shopee_margin_sheet_rows")
    .select("id, produto, variacao, num_variacoes, preco_cadastro, preco_promocao_rede, preco_relampago, custo_producao, embalagem_outros, link")
    .eq("user_id", userId)
    .order("produto", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    produto: r.produto,
    variacao: r.variacao ?? "",
    numVariacoes: r.num_variacoes,
    precoCadastro: r.preco_cadastro != null ? Number(r.preco_cadastro) : null,
    precoPromocaoRede: r.preco_promocao_rede != null ? Number(r.preco_promocao_rede) : null,
    precoRelampago: r.preco_relampago != null ? Number(r.preco_relampago) : null,
    custoProducao: r.custo_producao != null ? Number(r.custo_producao) : null,
    embalagemOutros: r.embalagem_outros != null ? Number(r.embalagem_outros) : null,
    link: r.link ?? null,
  }));
}

/** Importa linhas da planilha: upsert por (produto, variação) — atualiza só os preços
 * lidos da Shopee (cadastro/promoção/relâmpago). Custo de produção e embalagem NUNCA
 * são sobrescritos por um reimport (só são setados se a linha ainda não existia). */
export async function upsertMarginRowsFromImport(
  userId: string,
  rows: MarginRow[],
): Promise<{ ok: true; imported: number; updated: number } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase não configurado." };

  const { data: existing, error: fetchErr } = await supabase
    .from("shopee_margin_sheet_rows")
    .select("id, produto, variacao")
    .eq("user_id", userId);
  if (fetchErr) return { ok: false, message: fetchErr.message };

  const existingKey = new Map((existing ?? []).map((r) => [`${r.produto}\u0000${r.variacao}`, r.id as string]));

  let imported = 0;
  let updated = 0;
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const payload = chunk.map((r) => {
      const key = `${r.produto}\u0000${r.variacao}`;
      const id = existingKey.get(key);
      if (id) updated++;
      else imported++;
      return {
        ...(id ? { id } : {}),
        user_id: userId,
        produto: r.produto,
        variacao: r.variacao,
        num_variacoes: r.numVariacoes,
        preco_cadastro: r.precoCadastro,
        preco_promocao_rede: r.precoPromocaoRede,
        preco_relampago: r.precoRelampago,
        link: r.link,
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase
      .from("shopee_margin_sheet_rows")
      .upsert(payload, { onConflict: "user_id,produto,variacao" });
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true, imported, updated };
}

/** Atualiza só custo de produção / embalagem de uma linha (edição inline na grade). */
export async function updateMarginRowCosts(
  rowId: string,
  custoProducao: number | null,
  embalagemOutros: number | null,
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("shopee_margin_sheet_rows")
    .update({ custo_producao: custoProducao, embalagem_outros: embalagemOutros, updated_at: new Date().toISOString() })
    .eq("id", rowId);
}

export async function deleteMarginRow(rowId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("shopee_margin_sheet_rows").delete().eq("id", rowId);
}

export async function fetchMarginParams(userId: string): Promise<MarginParams> {
  if (!supabase) return DEFAULT_MARGIN_PARAMS;
  const { data, error } = await supabase
    .from("shopee_margin_sheet_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.data) return DEFAULT_MARGIN_PARAMS;
  return { ...DEFAULT_MARGIN_PARAMS, ...(data.data as Partial<MarginParams>) };
}

export async function saveMarginParams(userId: string, params: MarginParams): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("shopee_margin_sheet_settings")
    .upsert({ user_id: userId, data: params, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}
