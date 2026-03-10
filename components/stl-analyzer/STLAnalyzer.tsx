"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import type * as THREE from "three";
import { parseSTL, type STLAnalysis } from "@/lib/stlParser";
import { parse3MF } from "@/lib/threeMFParser";
import { STLViewer } from "./STLViewer";
import { STLResults } from "./STLResults";
import { useCalculatorStore } from "@/store/calculatorStore";

type FileType = "stl" | "3mf";

interface Analysis extends STLAnalysis {
  fileType: FileType;
}

export function STLAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [geometries, setGeometries] = useState<THREE.BufferGeometry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const { setStlPreset } = useCalculatorStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploaded = acceptedFiles[0];
    if (!uploaded) return;

    setLoading(true);
    setFile(uploaded);

    const ext = uploaded.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "3mf") {
        const result = await parse3MF(uploaded);
        setGeometries(result.geometries);
        setAnalysis({
          volume: result.combinedAnalysis.totalVolume,
          volumeCm3: Number((result.combinedAnalysis.totalVolume / 1000).toFixed(2)),
          weight: result.combinedAnalysis.totalWeight,
          dimensions: result.combinedAnalysis.dimensions,
          triangleCount: result.geometries.reduce((acc, g) => {
            const count = g.index ? g.index.count : g.attributes.position.count;
            return acc + count / 3;
          }, 0),
          estimatedTime: result.combinedAnalysis.estimatedTime,
          estimatedCost: result.combinedAnalysis.estimatedCost,
          fileType: "3mf",
        });
      } else {
        const result = await parseSTL(uploaded);
        setGeometries([result.geometry]);
        setAnalysis({ ...result.analysis, fileType: "stl" });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Erro ao analisar arquivo 3D", error);
      alert("Não foi possível analisar este arquivo. Use STL ou 3MF exportado de um slicer.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "model/stl": [".stl"],
      "model/3mf": [".3mf"],
      "application/vnd.ms-package.3dmanufacturing-3dmodel+xml": [".3mf"],
    },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  });

  const applyToCalculator = () => {
    if (!analysis) return;
    setStlPreset({
      weightGrams: analysis.weight,
      estimatedMinutes: analysis.estimatedTime,
    });
    alert("Peso e tempo enviados para a calculadora. Abra a aba Calculadora.");
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {!geometries.length && (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
            isDragActive
              ? "border-cyan-500 bg-cyan-500/10 shadow-neon-cyan"
              : "border-slate-700 bg-slate-950/70 hover:border-slate-400"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 shadow-neon-cyan">
              <span className="text-xl font-bold">3D</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-100">
                {isDragActive ? "Solte o arquivo aqui" : "Arraste seu arquivo STL ou 3MF"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                ou clique para selecionar • Máx. 100MB • formatos .stl ou .3mf
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Analisando geometria 3D...</p>
        </div>
      )}

      {geometries.length > 0 && analysis && !loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
            <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">
              Preview 3D
            </div>
            <div className="h-96">
              <STLViewer geometries={geometries} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <STLResults analysis={analysis} fileName={file?.name} onApply={applyToCalculator} />
          </div>
        </div>
      )}
    </div>
  );
}

