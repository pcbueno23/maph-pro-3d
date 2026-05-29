"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Phone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { fetchUserContact, upsertUserContact } from "@/lib/supabaseUserContact";
import {
  isValidBrazilWhatsapp,
  normalizeBrazilWhatsapp,
  WHATSAPP_INVALID_MESSAGE,
} from "@/lib/phoneBr";

export default function CompletarCadastroPage() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const existing = await fetchUserContact(user.id);
        if (existing && isValidBrazilWhatsapp(existing)) {
          router.replace("/");
          return;
        }
        if (existing) setPhone(existing);
      } finally {
        setChecking(false);
      }
    })();
  }, [initialized, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    const normalized = normalizeBrazilWhatsapp(phone);
    if (!isValidBrazilWhatsapp(normalized)) {
      setError(WHATSAPP_INVALID_MESSAGE);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await upsertUserContact(user.id, normalized);
      await supabase.auth.updateUser({
        data: { contact_whatsapp: normalized },
      });
      router.replace("/");
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!initialized || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Carregando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-neon-cyan backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-900/80">
            <Image
              src="/logo-maph-pro-3d.png"
              alt="MAPH PRO 3D"
              width={64}
              height={64}
              className="h-12 w-12 object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-50">MAPH PRO 3D</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-100">
              Complete seu cadastro
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Informe seu WhatsApp para continuar. Usamos para suporte e novidades do seu
              negócio.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-300">
              WhatsApp <span className="text-rose-400">*</span>
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="DDD + número (ex.: 11 99999-9999)"
              />
            </div>
          </label>

          {error ? <p className="text-xs text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Salvando…" : "Continuar para o app"}
          </button>
        </form>
      </div>
    </div>
  );
}
