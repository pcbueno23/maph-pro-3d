import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminApiAuth";
import { listAffiliates, createAffiliate } from "@/lib/affiliates";

// GET /api/admin/affiliates — lista todos os afiliados
export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  try {
    const affiliates = await listAffiliates();
    return NextResponse.json({ affiliates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao listar afiliados.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/admin/affiliates — criar novo afiliado
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  let body: {
    name?: string;
    email?: string;
    code?: string;
    commission_rate?: number;
    pix_key?: string | null;
    notes?: string | null;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { name, email, code, commission_rate } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "E-mail obrigatório." }, { status: 400 });
  if (!code?.trim()) return NextResponse.json({ error: "Código obrigatório." }, { status: 400 });
  if (!/^[A-Z0-9_-]{3,20}$/i.test(code.trim()))
    return NextResponse.json(
      { error: "Código inválido. Use 3–20 caracteres: letras, números, _ ou -." },
      { status: 400 },
    );

  const rate = commission_rate ?? 0.2;
  if (rate < 0 || rate > 1)
    return NextResponse.json({ error: "Comissão deve ser entre 0 e 1 (ex: 0.20 = 20%)." }, { status: 400 });

  try {
    const affiliate = await createAffiliate({
      name: name.trim(),
      email: email.trim(),
      code: code.trim(),
      commission_rate: rate,
      pix_key: body.pix_key ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar afiliado.";
    const isDup = msg.includes("duplicate") || msg.includes("unique");
    return NextResponse.json(
      { error: isDup ? "E-mail ou código já cadastrado." : msg },
      { status: isDup ? 409 : 500 },
    );
  }
}
