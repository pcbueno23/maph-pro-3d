import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface CostItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  items: CostItem[];
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CostBreakdownChart({ items }: Props) {
  return (
    <div className="h-56 rounded-xl bg-slate-950/60 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Distribuição dos custos
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.6)" }}
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: "#1f2937",
              borderRadius: 12,
              fontSize: 11,
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            label={false}
            style={{ transition: "all 0.2s ease-out" }}
          >
            {items.map((entry) => (
              <cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
