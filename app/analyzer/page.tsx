import type { Metadata } from "next";
import { STLAnalyzer } from "@/components/stl-analyzer/STLAnalyzer";

export const metadata: Metadata = {
  title: "Analisador STL | MAPH PRO 3D",
  description: "Analise arquivos STL e envie peso/tempo automaticamente para a calculadora.",
};

export default function AnalyzerPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Analisador STL
        </h1>
        <p className="text-sm text-slate-400">
          Arraste seu arquivo 3D (.stl) para estimar volume, peso, tempo e custo de impressão.
        </p>
      </div>
      <STLAnalyzer />
    </div>
  );
}

