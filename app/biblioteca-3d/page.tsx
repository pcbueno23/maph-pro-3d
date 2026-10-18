"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, FolderX, RefreshCw, Search, TriangleAlert, Boxes } from "lucide-react";
import type { ConnectedFolder, FolderStatus, ModelFileEntry, ModelFileType } from "@/lib/modelLibrary/types";
import { loadStoredFolders, saveFolder, removeStoredFolder } from "@/lib/modelLibrary/folderStore";
import { hasReadPermission, requestReadPermission } from "@/lib/modelLibrary/permissions";
import { scanFolder } from "@/lib/modelLibrary/scan";
import { ModelCard } from "@/components/modelLibrary/ModelCard";

type TypeFilter = "all" | ModelFileType;
type SortMode = "recent" | "name";

export default function Biblioteca3DPage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<ConnectedFolder[]>([]);
  const [folderStatus, setFolderStatus] = useState<Record<string, FolderStatus>>({});
  const [entries, setEntries] = useState<ModelFileEntry[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const scanCancelRef = useRef(new Map<string, { cancelled: boolean }>());

  useEffect(() => {
    setSupported(typeof window !== "undefined" && typeof window.showDirectoryPicker === "function");
  }, []);

  useEffect(() => {
    if (supported !== true) return;
    (async () => {
      const stored = await loadStoredFolders();
      setFolders(stored);
      for (const folder of stored) {
        const granted = await hasReadPermission(folder.handle);
        setFolderStatus((prev) => ({ ...prev, [folder.id]: granted ? "scanning" : "needs-permission" }));
        if (granted) void runScan(folder);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  function removeEntriesOfFolder(folderId: string) {
    setEntries((prev) => prev.filter((e) => e.folderId !== folderId));
  }

  async function runScan(folder: ConnectedFolder) {
    const previousToken = scanCancelRef.current.get(folder.id);
    if (previousToken) previousToken.cancelled = true;
    const cancelToken = { cancelled: false };
    scanCancelRef.current.set(folder.id, cancelToken);
    removeEntriesOfFolder(folder.id);
    setFolderStatus((prev) => ({ ...prev, [folder.id]: "scanning" }));

    let buffer: ModelFileEntry[] = [];
    let flushTimer: number | null = null;
    const flush = () => {
      if (buffer.length === 0) return;
      const chunk = buffer;
      buffer = [];
      setEntries((prev) => [...prev, ...chunk]);
    };
    const onEntry = (entry: ModelFileEntry) => {
      buffer.push(entry);
      if (flushTimer == null) {
        flushTimer = window.setTimeout(() => {
          flushTimer = null;
          flush();
        }, 150);
      }
    };

    try {
      await scanFolder(folder.handle, folder.id, folder.label, onEntry, cancelToken);
      if (flushTimer != null) window.clearTimeout(flushTimer);
      flush();
      setFolderStatus((prev) => ({ ...prev, [folder.id]: cancelToken.cancelled ? prev[folder.id] : "ready" }));
    } catch {
      if (flushTimer != null) window.clearTimeout(flushTimer);
      flush();
      setFolderStatus((prev) => ({ ...prev, [folder.id]: "error" }));
    }
  }

  async function handleAddFolder() {
    if (!window.showDirectoryPicker) return;
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ mode: "read" });
    } catch {
      return; // usuário cancelou o seletor
    }
    const folder: ConnectedFolder = { id: crypto.randomUUID(), label: handle.name, handle };
    await saveFolder(folder);
    setFolders((prev) => [...prev, folder]);
    void runScan(folder);
  }

  async function handleReconnect(folder: ConnectedFolder) {
    const granted = await requestReadPermission(folder.handle);
    if (granted) void runScan(folder);
  }

  async function handleRemoveFolder(folder: ConnectedFolder) {
    const token = scanCancelRef.current.get(folder.id);
    if (token) token.cancelled = true;
    await removeStoredFolder(folder.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    removeEntriesOfFolder(folder.id);
    setFolderStatus((prev) => {
      const next = { ...prev };
      delete next[folder.id];
      return next;
    });
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = entries;
    if (typeFilter !== "all") list = list.filter((e) => e.ext === typeFilter);
    if (term) list = list.filter((e) => e.name.toLowerCase().includes(term));
    const sorted = [...list].sort((a, b) =>
      sortMode === "recent" ? b.lastModified - a.lastModified : a.name.localeCompare(b.name, "pt-BR"),
    );
    return sorted;
  }, [entries, search, typeFilter, sortMode]);

  const stlCount = useMemo(() => entries.filter((e) => e.ext === "stl").length, [entries]);
  const mfCount = useMemo(() => entries.filter((e) => e.ext === "3mf").length, [entries]);
  const anyScanning = Object.values(folderStatus).some((s) => s === "scanning");

  if (supported === null) return null;

  if (supported === false) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">Biblioteca de Modelos 3D</h1>
        <div className="glass-panel flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Esse recurso só funciona no Chrome ou Edge.</p>
            <p className="mt-1 text-amber-200/80">
              Ele usa um recurso do navegador pra ler arquivos direto da sua pasta (File System Access API) que o
              Firefox e o Safari ainda não suportam. Abra essa página no Chrome ou Edge pra usar a Biblioteca.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">Biblioteca de Modelos 3D</h1>
          <p className="mt-1 text-sm text-slate-400">
            Aponte a pasta onde ficam seus downloads do MakerWorld, Printables, Cults3D etc. — a gente lê os .stl e
            .3mf direto do seu computador e mostra a miniatura de cada um, pra ficar fácil de reconhecer qual é
            qual. Pra abrir no fatiador, é só achar pelo nome/miniatura e abrir normalmente pelo Explorer — o
            navegador não consegue abrir o Bambu Studio sozinho.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleAddFolder()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          <FolderPlus className="h-4 w-4" />
          Adicionar pasta
        </button>
      </div>

      {folders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => {
            const status = folderStatus[folder.id] ?? "scanning";
            return (
              <div
                key={folder.id}
                className="glass-panel flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300"
              >
                <Boxes className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-medium">{folder.label}</span>
                {status === "scanning" ? (
                  <span className="text-slate-500">lendo…</span>
                ) : status === "needs-permission" ? (
                  <button
                    type="button"
                    onClick={() => void handleReconnect(folder)}
                    className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300 hover:bg-amber-500/25"
                  >
                    Reconectar
                  </button>
                ) : status === "error" ? (
                  <span className="font-semibold text-rose-400">erro ao ler</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void runScan(folder)}
                    title="Atualizar lista desta pasta"
                    className="text-slate-500 hover:text-cyan-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleRemoveFolder(folder)}
                  title="Remover pasta"
                  className="text-slate-600 hover:text-rose-400"
                >
                  <FolderX className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {entries.length > 0 || anyScanning ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Coleção</p>
              <p className="mt-0.5 text-lg font-bold text-slate-50">{entries.length} modelos</p>
            </div>
            <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-violet-400">Arquivos STL</p>
              <p className="mt-0.5 text-lg font-bold text-slate-50">{stlCount}</p>
            </div>
            <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-emerald-400">Arquivos 3MF</p>
              <p className="mt-0.5 text-lg font-bold text-slate-50">{mfCount}</p>
            </div>
            <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Exibindo</p>
              <p className="mt-0.5 text-lg font-bold text-slate-50">{filtered.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar modelo por nome…"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <div className="flex overflow-hidden rounded-xl border border-slate-800">
              {(["all", "stl", "3mf"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-2 text-xs font-semibold transition ${
                    typeFilter === t
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-slate-950/60 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  {t === "all" ? "Todos" : t.toUpperCase()}
                </button>
              ))}
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="recent">Mais recentes</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((entry) => (
              <ModelCard key={entry.id} entry={entry} />
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhum modelo bateu com esse filtro.</p>
          ) : null}
        </>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
          <Boxes className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-200">Nenhuma pasta conectada ainda</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Clique em "Adicionar pasta" e escolha a pasta onde você salva os modelos baixados. Da próxima vez, o
            navegador lembra — não precisa escolher de novo.
          </p>
        </div>
      )}
    </div>
  );
}
