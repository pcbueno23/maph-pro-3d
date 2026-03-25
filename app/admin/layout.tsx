import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/adminApiAuth";

/**
 * Layout server-side para /admin.
 * Segunda barreira de segurança (o middleware já redireciona, mas este
 * layout garante proteção mesmo se o middleware for bypassado ou desabilitado).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/");
  }

  return <>{children}</>;
}
