"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import { useSalesStore } from "@/store/salesStore";
import {
  saveUserInventory,
  saveUserSupplies,
  saveUserSales,
} from "@/lib/supabaseUserData";

const DEBOUNCE_MS = 2000;

/** Quando o usuário está logado, grava estoque, insumos e vendas na nuvem após alterações (com debounce). */
export function PersistUserData() {
  const user = useAuthStore((s) => s.user);
  const items = useInventoryStore((s) => s.items);
  const supplies = useSuppliesStore((s) => s.supplies);
  const sales = useSalesStore((s) => s.sales);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!user) return;
    // Evita gravar logo após hidratar da nuvem no login
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const t = setTimeout(() => {
      saveUserInventory(user.id, items).catch(() => {});
      saveUserSupplies(user.id, supplies).catch(() => {});
      saveUserSales(user.id, sales).catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [user, items, supplies, sales]);

  return null;
}
