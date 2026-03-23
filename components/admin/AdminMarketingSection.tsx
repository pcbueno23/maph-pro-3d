"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  DEFAULT_FORNECEDORES,
  type MarketingFornecedor,
  type MarketingPromocao,
} from "@/lib/appMarketing";

function emptyFornecedor(): MarketingFornecedor {
  return { nome: "", url: "", descricao: "" };
}

function emptyPromocao(): MarketingPromocao {
  return {
    titulo: "",
    url: "",
    descricao: "",
    plataforma: "Shopee",
  };
}

export function AdminMarketingSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<MarketingFornecedor[]>([]);
  const [promocoes, setPromocoes] = useState<MarketingPromocao[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sem sessão.");
        return;
      }
      const res = await fetch("/api/admin/marketing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        error?: string;
        fornecedores?: MarketingFornecedor[];
        promocoes?: MarketingPromocao[];
        updated_at?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Erro ao carregar.");
        return;
      }
      setFornecedores(
        Array.isArray(data.fornecedores) && data.fornecedores.length > 0
          ? data.fornecedores
          : [...DEFAULT_FORNECEDORES],
      );
      setPromocoes(
        Array.isArray(data.promocoes) && data.promocoes.length > 0
          ? data.promocoes
          : [emptyPromocao()],
      );
      setUpdatedAt(data.updated_at ?? null);
    } catch {
      setError("Erro de rede ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const payload = {
        fornecedores: fornecedores.filter((f) => f.nome.trim().length > 0),
        promocoes: promocoes.filter((p) => p.titulo.trim().length > 0),
      };
      const res = await fetch("/api/admin/marketing", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        updated_at?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Falha ao salvar.");
        return;
      }
      if (data.updated_at) setUpdatedAt(data.updated_at);
    } catch {
      setError("Erro de rede ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-slate-50">
          Fornecedores e promoções
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          O que você salvar aqui aparece nas páginas públicas{" "}
          <strong className="text-slate-200">/fornecedores</strong> e{" "}
          <strong className="text-slate-200">/promocoes</strong>. É necessário
          criar a tabela <code className="text-xs text-cyan-300">app_marketing</code>{" "}
          no Supabase (migration do repositório).
        </p>
        {updatedAt ? (
          <p className="mt-1 text-xs text-slate-500">
            Última atualização:{" "}
            {new Date(updatedAt).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        ) : null}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-200">Fornecedores</h3>
              <button
                type="button"
                onClick={() =>
                  setFornecedores((prev) => [...prev, emptyFornecedor()])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {fornecedores.map((f, i) => (
                <div
                  key={`f-${i}`}
                  className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:grid-cols-[1fr_1fr] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                >
                  <input
                    type="text"
                    value={f.nome}
                    placeholder="Nome"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFornecedores((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, nome: v } : x)),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600"
                  />
                  <input
                    type="url"
                    value={f.url ?? ""}
                    placeholder="https://..."
                    onChange={(e) => {
                      const v = e.target.value;
                      setFornecedores((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, url: v } : x)),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 sm:col-span-2 lg:col-span-1"
                  />
                  <input
                    type="text"
                    value={f.descricao ?? ""}
                    placeholder="Descrição (opcional)"
                    onChange={(e) => {
                      const v = e.target.value;
                      setFornecedores((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, descricao: v } : x,
                        ),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 sm:col-span-2 lg:col-span-1"
                  />
                  <button
                    type="button"
                    aria-label="Remover fornecedor"
                    onClick={() =>
                      setFornecedores((prev) =>
                        prev.length <= 1 ? prev : prev.filter((_, j) => j !== i),
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center self-start rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 sm:col-span-2 sm:justify-self-end lg:col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-200">Promoções</h3>
              <button
                type="button"
                onClick={() =>
                  setPromocoes((prev) => [...prev, emptyPromocao()])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {promocoes.map((p, i) => (
                <div
                  key={`p-${i}`}
                  className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]"
                >
                  <input
                    type="text"
                    value={p.titulo}
                    placeholder="Título"
                    onChange={(e) => {
                      const v = e.target.value;
                      setPromocoes((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, titulo: v } : x,
                        ),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600"
                  />
                  <input
                    type="url"
                    value={p.url}
                    placeholder="URL da oferta"
                    onChange={(e) => {
                      const v = e.target.value;
                      setPromocoes((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, url: v } : x)),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 lg:col-span-1"
                  />
                  <select
                    value={p.plataforma}
                    onChange={(e) => {
                      const v = e.target.value as MarketingPromocao["plataforma"];
                      setPromocoes((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, plataforma: v } : x,
                        ),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="ML">Mercado Livre</option>
                  </select>
                  <input
                    type="text"
                    value={p.descricao ?? ""}
                    placeholder="Descrição (opcional)"
                    onChange={(e) => {
                      const v = e.target.value;
                      setPromocoes((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, descricao: v } : x,
                        ),
                      );
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 lg:col-span-1"
                  />
                  <button
                    type="button"
                    aria-label="Remover promoção"
                    onClick={() =>
                      setPromocoes((prev) =>
                        prev.length <= 1 ? prev : prev.filter((_, j) => j !== i),
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center self-start rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 lg:col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-600/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar fornecedores e promoções"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Recarregar do banco
            </button>
          </div>
        </>
      )}
    </div>
  );
}
