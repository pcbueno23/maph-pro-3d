import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Em desenvolvimento, é útil ter um erro claro caso as variáveis não estejam configuradas.
  // Em produção isso deve estar sempre definido.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

/**
 * Client Supabase para uso em componentes client ("use client").
 * Usa cookie-based storage (via @supabase/ssr) para que a sessão
 * fique acessível no servidor (middleware, Server Components).
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : undefined;

