import { redirect } from "next/navigation";

/** Mesma home que `/` — evita HTML vazio + redirect só no client (login/OAuth usam /dashboard). */
export default function DashboardPathRedirect() {
  redirect("/");
}
