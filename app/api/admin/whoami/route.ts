import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getBearerToken,
  isAdminEmail,
} from "@/lib/adminApiAuth";

/**
 * Indica se a sessão atual pertence a um admin (lista ADMIN_EMAILS).
 * 401 sem token ou sessão inválida; 200 com { admin: boolean }.
 */
export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json({ admin: false }, { status: 500 });
  }
  const supabase = createClient(url, anon);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  return NextResponse.json({ admin: isAdminEmail(user.email) });
}
