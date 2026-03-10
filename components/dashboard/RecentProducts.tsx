import type { Product } from "@/types";

interface Props {
  products: Product[];
}

export function RecentProducts({ products }: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-100">
          Últimos produtos
        </h2>
        <span className="text-xs text-slate-500">
          {products.length} registro(s)
        </span>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ainda não há produtos salvos. Faça um cálculo na calculadora para
          começar.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-100">{product.name}</p>
                <p className="text-xs text-slate-500">
                  {product.weight} g •{" "}
                  {product.price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: product.currency,
                  })}
                </p>
              </div>
              <div className="text-right text-xs">
                <p
                  className={
                    (product.margin ?? 0) >= 0
                      ? "font-semibold text-emerald-400"
                      : "font-semibold text-rose-400"
                  }
                >
                  {(product.margin ?? 0).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">
                  {product.marketplace}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

