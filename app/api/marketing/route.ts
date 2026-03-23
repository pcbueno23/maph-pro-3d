import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  resolveFornecedores,
  resolvePromocoes,
} from "@/lib/appMarketing";

/**
 * Conteúdo público para /fornecedores e /promocoes.
 * Sem autenticação. Se o banco não existir ou estiver vazio, usa fallbacks do código.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json({
      fornecedores: resolveFornecedores([]),
      promocoes: resolvePromocoes([]),
      source: "fallback" as const,
    });
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("app_marketing")
    .select("fornecedores, promocoes, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({
      fornecedores: resolveFornecedores([]),
      promocoes: resolvePromocoes([]),
      source: "fallback" as const,
    });
  }

  return NextResponse.json({
    fornecedores: resolveFornecedores(data.fornecedores),
    promocoes: resolvePromocoes(data.promocoes),
    updated_at: data.updated_at ?? null,
    source: "db" as const,
  });
}
