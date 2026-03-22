"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, Phone, User, Building2, IdCard, Camera } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { uploadCompanyLogoFromDataUrl } from "@/lib/uploadCompanyLogo";

/** Redimensiona e exporta JPEG para caber no user_metadata do Supabase e no PDF. */
function fileToCompressedJpegDataUrl(
  file: File,
  maxSide = 512,
  quality = 0.88,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new window.Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (!w || !h) {
            reject(new Error("Imagem inválida."));
            return;
          }
          const scale = Math.min(1, maxSide / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Não foi possível processar a imagem."));
            return;
          }
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          reject(new Error("Não foi possível processar a imagem."));
        }
      };
      img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

type AccountFields = {
  fullName: string;
  phone: string;
  companyName: string;
  companyDocument: string;
  companyEmail: string;
  companyPhone: string;
  companyLogo: string;
};

const EMPTY_FIELDS: AccountFields = {
  fullName: "",
  phone: "",
  companyName: "",
  companyDocument: "",
  companyEmail: "",
  companyPhone: "",
  companyLogo: "",
};

export function AccountForm() {
  const user = useAuthStore((s) => s.user);

  const [fields, setFields] = useState<AccountFields>(EMPTY_FIELDS);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const md = (user.user_metadata ?? {}) as Record<string, unknown>;
    setFields({
      fullName: String(md.full_name ?? md.name ?? ""),
      phone: String(md.phone ?? md.contact_phone ?? ""),
      companyName: String(md.company_name ?? ""),
      companyDocument: String(md.company_document ?? ""),
      companyEmail: String(md.company_email ?? ""),
      companyPhone: String(md.company_phone ?? ""),
      companyLogo: String(
        md.company_logo_url ?? md.company_logo ?? md.avatar_url ?? "",
      ).trim(),
    });
  }, [user]);

  const logoSrc = useMemo(() => {
    if (fields.companyLogo?.trim()) return fields.companyLogo;
    return "/logo-maph-pro-3d.png";
  }, [fields.companyLogo]);

  function onFieldChange<K extends keyof AccountFields>(key: K, value: AccountFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida para o logo.");
      return;
    }

    try {
      setError(null);
      const dataUrl = await fileToCompressedJpegDataUrl(file);
      onFieldChange("companyLogo", dataUrl);
    } catch (err: any) {
      setError(err?.message ?? "Falha ao carregar logo.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!supabase) {
      setError("Supabase não está configurado.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const wantsPasswordChange =
        currentPassword.trim() || newPassword.trim() || confirmPassword.trim();

      if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error("Preencha senha atual, nova senha e confirmação.");
        }
        if (newPassword.length < 6) {
          throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("A confirmação da nova senha não confere.");
        }
        if (!user.email) {
          throw new Error("Seu usuário não possui e-mail para validar senha atual.");
        }

        const { error: reAuthError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (reAuthError) {
          throw new Error("Senha atual inválida.");
        }

        const { error: pwdError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (pwdError) throw pwdError;
      }

      const rawLogo = fields.companyLogo.trim();
      const prevMd = (user.user_metadata ?? {}) as Record<string, unknown>;
      /** Mantém logo já salva se o usuário não reenviar arquivo (evita apagar ao salvar só nome/CNPJ). */
      let company_logo_url = String(prevMd.company_logo_url ?? "").trim();
      let company_logo = String(prevMd.company_logo ?? "").trim();

      if (rawLogo.startsWith("data:image/")) {
        const up = await uploadCompanyLogoFromDataUrl(user.id, rawLogo);
        if ("error" in up) {
          throw new Error(up.error);
        }
        company_logo_url = up.publicUrl;
        company_logo = "";
      } else if (rawLogo.startsWith("http://") || rawLogo.startsWith("https://")) {
        company_logo_url = rawLogo;
        company_logo = "";
      }

      const nextMetadata = {
        ...(user.user_metadata ?? {}),
        full_name: fields.fullName.trim(),
        phone: fields.phone.trim(),
        contact_phone: fields.phone.trim(),
        company_name: fields.companyName.trim(),
        company_document: fields.companyDocument.trim(),
        company_email: fields.companyEmail.trim(),
        company_phone: fields.companyPhone.trim(),
        company_logo_url,
        company_logo,
      };

      const { error: metaError } = await supabase.auth.updateUser({
        data: nextMetadata,
      });
      if (metaError) throw metaError;

      const { data: sess } = await supabase.auth.getSession();
      if (sess.session?.user) {
        useAuthStore.getState().setAuth(sess.session.user, sess.session);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Dados da conta atualizados com sucesso.");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível salvar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <h2 className="text-2xl font-semibold text-slate-50">Dados Pessoais</h2>
          <p className="mb-4 text-sm text-slate-400">Atualize suas informações pessoais</p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Nome completo</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <User className="h-4 w-4 text-slate-500" />
                <input
                  value={fields.fullName}
                  onChange={(e) => onFieldChange("fullName", e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="Digite seu nome completo"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Telefone</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Phone className="h-4 w-4 text-slate-500" />
                <input
                  value={fields.phone}
                  onChange={(e) => onFieldChange("phone", e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <h2 className="text-2xl font-semibold text-slate-50">Dados da Empresa</h2>
          <p className="mb-4 text-sm text-slate-400">Atualize as informações da sua empresa</p>

          <div className="mb-4 flex flex-col items-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-700">
              <Image src={logoSrc} alt="Logo da empresa" fill className="object-cover" />
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900">
              <Camera className="h-3.5 w-3.5" />
              Alterar logo
              <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            </label>
            <p className="mt-1 max-w-[260px] text-center text-[10px] text-slate-500">
              Usado nos PDFs de orçamento. Escolha a imagem e clique em{" "}
              <span className="text-slate-400">Salvar alterações</span>.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Nome da empresa</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Building2 className="h-4 w-4 text-slate-500" />
                <input
                  value={fields.companyName}
                  onChange={(e) => onFieldChange("companyName", e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="Digite o nome da empresa"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">CNPJ/CPF</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <IdCard className="h-4 w-4 text-slate-500" />
                <input
                  value={fields.companyDocument}
                  onChange={(e) => onFieldChange("companyDocument", e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">E-mail da empresa</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={fields.companyEmail}
                  onChange={(e) => onFieldChange("companyEmail", e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="Digite o e-mail da empresa"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Telefone da empresa</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Phone className="h-4 w-4 text-slate-500" />
                <input
                  value={fields.companyPhone}
                  onChange={(e) => onFieldChange("companyPhone", e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <h2 className="text-2xl font-semibold text-slate-50">Segurança</h2>
          <p className="mb-4 text-sm text-slate-400">Altere sua senha de acesso</p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Senha atual</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="Digite sua senha atual"
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="text-slate-400">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Nova senha</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="text-slate-400">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Confirmar nova senha</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="Digite novamente a nova senha"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-slate-400">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300">
            <p className="font-semibold">Dica de segurança</p>
            <p className="mt-1">
              Use uma senha forte com pelo menos 6 caracteres. Deixe os campos de senha vazios se não quiser alterar.
            </p>
          </div>
        </section>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

