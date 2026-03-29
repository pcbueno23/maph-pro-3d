import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/adminApiAuth";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Captura ?ref= e salva cookie de afiliado (30 dias)
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Z0-9_-]{3,20}$/i.test(ref.trim())) {
    res.cookies.set("ref_code", ref.trim().toUpperCase(), {
      httpOnly: false,   // JS precisa ler para passar no checkout
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Proteção da rota /admin — só executa para esse path
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!isAdminEmail(user?.email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  // Roda em todas as páginas (para capturar ?ref=) exceto assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp|webmanifest)).*)"],
};
