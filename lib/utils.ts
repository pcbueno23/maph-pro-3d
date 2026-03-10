export function formatCurrency(value: number, currency: "BRL" | "USD" = "BRL") {
  return value.toLocaleString(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
  });
}

export function safeNumber(value: number | null | undefined): number {
  if (!value || Number.isNaN(value)) return 0;
  return value;
}

