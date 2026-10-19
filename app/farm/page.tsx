"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useBambuFarm, type BambuDeviceUI } from "@/hooks/useBambuFarm";
import { useAnycubicFarm, type AnycubicDeviceUI } from "@/hooks/useAnycubicFarm";
import { Thermometer, Layers, Clock, Wifi, WifiOff, RefreshCw, FileBox, TriangleAlert } from "lucide-react";

function formatRemaining(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function statusLabel(d: BambuDeviceUI): string {
  if (!d.online) return "offline";
  const raw = (d.printStatus ?? "").toUpperCase();
  const map: Record<string, string> = {
    RUNNING: "imprimindo",
    PAUSE: "pausada",
    // "FINISH" confirmado ao vivo (19/10/2026) — impressora terminou e está livre, por
    // isso vira "ociosa" igual quem nunca imprimiu, não um status à parte.
    FINISH: "ociosa",
    FAILED: "falhou",
    IDLE: "ociosa",
    PREPARE: "preparando",
  };
  if (d.printStatus) return map[raw] ?? d.printStatus.toLowerCase();
  if (d.restPrintStatus === "RUNNING") return "imprimindo";
  return "conectada";
}

const TERMINAL_STATUSES = new Set(["FINISH", "FAILED", "IDLE"]);

/** "Imprimindo agora" de verdade — não conta quem já chegou a 100%/finalizou (gcode_state
 * FINISH/FAILED/IDLE), só porque o progresso ainda aparece no card. */
function isActivelyPrinting(d: BambuDeviceUI): boolean {
  if (!d.online) return false;
  if (d.progressPercent != null) {
    const raw = (d.printStatus ?? "").toUpperCase();
    return !TERMINAL_STATUSES.has(raw);
  }
  return d.restPrintStatus === "RUNNING";
}

function PrinterCard({ d }: { d: BambuDeviceUI }) {
  const [showRaw, setShowRaw] = useState(false);
  const hasRichData = d.online && d.progressPercent != null;
  // FINISH/FAILED/IDLE = já não tá imprimindo mais, mesmo com progresso/camada ainda
  // presentes no último report — card volta pro visual de ociosa, não fica travado em
  // "100% concluído" pra sempre (ver statusLabel pro mesmo critério no selinho).
  const terminal = hasRichData && TERMINAL_STATUSES.has((d.printStatus ?? "").toUpperCase());
  const printing = hasRichData && !terminal;
  // messagesWithPrint > 0 = a Bambu de fato respondeu com dado de impressão (mesmo que
  // seja "parada" de verdade) — confio no "sem impressão ativa" nesse caso. Se vier 0,
  // o poll MQTT desse ciclo não conseguiu confirmar nada, e "sem impressão ativa" seria
  // uma mentira — mostro o motivo em vez disso.
  const pollConfirmed = (d.pollDebug?.messagesWithPrint ?? 0) > 0;
  const pollFailed = d.online && !printing && d.pollDebug != null && !pollConfirmed;
  // Confirmado ao vivo: o endpoint de listagem (REST, sem MQTT/uid) já diz "RUNNING" com
  // confiança — uso isso como sinal básico de "imprimindo" enquanto o MQTT não emplaca.
  // Ignorado quando o MQTT já confirmou terminal nesse mesmo ciclo (mais recente que o REST).
  const restConfirmedPrinting = d.online && !printing && !terminal && d.restPrintStatus === "RUNNING";
  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-50">{d.name}</p>
          {d.model ? <p className="text-[11px] text-slate-500">{d.model}</p> : null}
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            d.online ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"
          }`}
        >
          {d.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {statusLabel(d)}
        </span>
      </div>

      {d.fileName ? (
        <p className="flex items-center gap-1.5 truncate text-xs text-slate-300" title={d.fileName}>
          <FileBox className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          {d.fileName}
        </p>
      ) : null}

      {printing ? (
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> falta {formatRemaining(d.remainingMinutes)}
            </span>
            <span className="font-semibold text-slate-200">{d.progressPercent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              style={{ width: `${Math.max(0, Math.min(100, d.progressPercent ?? 0))}%` }}
            />
          </div>
          {d.layerNum != null && d.totalLayerNum != null ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <Layers className="h-3 w-3" /> camada {d.layerNum} / {d.totalLayerNum}
            </p>
          ) : null}
        </div>
      ) : restConfirmedPrinting ? (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-[11px] text-cyan-200">
          <p className="font-semibold">🖨️ Imprimindo agora</p>
          <p className="mt-0.5 text-cyan-200/70">
            Confirmado pela Bambu — progresso/tempo/temperatura ainda não disponíveis aqui (dado mais rico
            depende de uma conexão que ainda não emplacou, ver aviso no topo da página).
          </p>
        </div>
      ) : pollFailed ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
          <p className="flex items-center gap-1 font-semibold">
            <TriangleAlert className="h-3 w-3 shrink-0" /> Não consegui confirmar o status ao vivo
          </p>
          <p className="mt-0.5 text-amber-200/80">
            {d.pollDebug?.error
              ? `Erro MQTT: ${d.pollDebug.error}`
              : d.pollDebug?.timedOut && !d.pollDebug.connected
                ? "Não conectou no MQTT da Bambu a tempo."
                : d.pollDebug?.timedOut && d.pollDebug.connected && !d.pollDebug.subscribed
                  ? "Conectou mas não conseguiu se inscrever no tópico."
                  : d.pollDebug?.timedOut
                    ? `Conectou, mas não chegou mensagem com dado de impressão em 6s (${d.pollDebug.messagesReceived} msg recebida(s) sem esse dado).`
                    : "Motivo desconhecido — manda esse card pro suporte."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-slate-500">{d.online ? "Sem impressão ativa." : "Impressora fora do ar."}</p>
          {terminal ? (
            <p className="mt-0.5 text-[10px] text-slate-600">
              Última impressão: {(d.printStatus ?? "").toUpperCase() === "FAILED" ? "falhou" : "concluída"}
            </p>
          ) : null}
          {d.online && pollConfirmed && d.printStatus && !terminal ? (
            <p className="mt-0.5 text-[10px] text-slate-600">status bruto da Bambu: "{d.printStatus}"</p>
          ) : null}
        </div>
      )}

      {d.nozzleTemper != null || d.bedTemper != null || d.chamberTemper != null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
          {d.nozzleTemper != null ? (
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-rose-400" />
              Bico {d.nozzleTemper.toFixed(0)}°
              {d.nozzleTargetTemper != null ? `/${d.nozzleTargetTemper.toFixed(0)}°` : ""}
            </span>
          ) : null}
          {d.bedTemper != null ? (
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-amber-400" />
              Mesa {d.bedTemper.toFixed(0)}°
              {d.bedTargetTemper != null ? `/${d.bedTargetTemper.toFixed(0)}°` : ""}
            </span>
          ) : null}
          {d.chamberTemper != null ? (
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-slate-400" />
              Câmara {d.chamberTemper.toFixed(0)}°
            </span>
          ) : null}
        </div>
      ) : null}

      {d.statusUpdatedAt ? (
        <p className="text-[10px] text-slate-600">
          Atualizado {new Date(d.statusUpdatedAt).toLocaleTimeString("pt-BR")}
        </p>
      ) : null}

      {d.raw != null ? (
        <div className="border-t border-slate-800 pt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-[10px] font-semibold text-slate-500 hover:text-cyan-300"
          >
            {showRaw ? "▾ esconder dado bruto" : "▸ ver dado bruto"}
          </button>
          {showRaw ? (
            <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-slate-900/80 p-2 text-[10px] leading-snug text-slate-400">
              {JSON.stringify(d.raw, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AnycubicCard({ d }: { d: AnycubicDeviceUI }) {
  const [showRaw, setShowRaw] = useState(false);
  // d.printing já vem do print_status do projeto via REST (/work/project/getProjects) — dá
  // certo em qualquer modo (web ou slicer), não depende mais só do MQTT confirmar algo.
  const printingRich = d.online && d.printing === true;
  // Só relevante no modo slicer, quando nem o MQTT nem o REST do projeto trouxeram nada.
  const pollFailed =
    d.online && d.printing == null && d.pollDebug != null && (d.pollDebug.messagesReceived ?? 0) === 0;

  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-50">{d.name}</p>
          {d.model ? <p className="text-[11px] text-slate-500">{d.model}</p> : null}
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            d.online ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"
          }`}
        >
          {d.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {!d.online ? "offline" : printingRich ? "imprimindo" : "ociosa"}
        </span>
      </div>

      {d.fileName ? (
        <p className="flex items-center gap-1.5 truncate text-xs text-slate-300" title={d.fileName}>
          <FileBox className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          {d.fileName}
        </p>
      ) : null}

      {printingRich ? (
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> falta {formatRemaining(d.remainingMinutes)}
            </span>
            <span className="font-semibold text-slate-200">{d.progressPercent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              style={{ width: `${Math.max(0, Math.min(100, d.progressPercent ?? 0))}%` }}
            />
          </div>
          {d.layerNum != null && d.totalLayerNum != null ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <Layers className="h-3 w-3" /> camada {d.layerNum} / {d.totalLayerNum}
            </p>
          ) : null}
        </div>
      ) : pollFailed ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
          <p className="flex items-center gap-1 font-semibold">
            <TriangleAlert className="h-3 w-3 shrink-0" /> Não consegui confirmar o status ao vivo
          </p>
          <p className="mt-0.5 text-amber-200/80">
            {d.pollDebug?.error
              ? `Erro MQTT: ${d.pollDebug.error}`
              : d.pollDebug?.timedOut && !d.pollDebug.connected
                ? "Não conectou no MQTT da Anycubic a tempo."
                : d.pollDebug?.timedOut && d.pollDebug.connected && !d.pollDebug.subscribed
                  ? "Conectou mas não conseguiu se inscrever no tópico."
                  : "Conectou, mas não chegou nenhuma mensagem nesse ciclo (impressora ociosa pode demorar mais pra publicar algo)."}
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">{d.online ? "Sem impressão ativa." : "Impressora fora do ar."}</p>
      )}

      {d.nozzleTemper != null || d.bedTemper != null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
          {d.nozzleTemper != null ? (
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-rose-400" />
              Bico {d.nozzleTemper.toFixed(0)}°
            </span>
          ) : null}
          {d.bedTemper != null ? (
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-amber-400" />
              Mesa {d.bedTemper.toFixed(0)}°
            </span>
          ) : null}
        </div>
      ) : null}

      {d.statusUpdatedAt ? (
        <p className="text-[10px] text-slate-600">
          Atualizado {new Date(d.statusUpdatedAt).toLocaleTimeString("pt-BR")}
        </p>
      ) : null}

      {d.raw != null ? (
        <div className="border-t border-slate-800 pt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-[10px] font-semibold text-slate-500 hover:text-cyan-300"
          >
            {showRaw ? "▾ esconder dado bruto" : "▸ ver dado bruto"}
          </button>
          {showRaw ? (
            <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-slate-900/80 p-2 text-[10px] leading-snug text-slate-400">
              {JSON.stringify(d.raw, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AnycubicSection() {
  const user = useAuthStore((s) => s.user);
  const ac = useAnycubicFarm(user?.id);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showLoginDebug, setShowLoginDebug] = useState(false);

  return (
    <div className="space-y-3 border-t border-slate-800 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Anycubic Kobra X</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Experimental de verdade — engenharia reversa de um projeto da comunidade, nunca testado ao vivo.
            Login é diferente do resto: precisa extrair um token do Anycubic Slicer Next (ver instruções abaixo).
          </p>
        </div>
        {ac.connected ? (
          <button
            type="button"
            onClick={() => void ac.refreshDevices()}
            disabled={ac.loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ac.loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        ) : null}
      </div>

      {ac.error ? (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <p className="whitespace-pre-wrap">{ac.error}</p>
          {ac.loginDebug ? (
            <div>
              <button
                type="button"
                onClick={() => setShowLoginDebug((v) => !v)}
                className="text-[11px] font-semibold text-amber-300 hover:text-amber-100"
              >
                {showLoginDebug ? "▾ esconder diagnóstico" : "▸ ver diagnóstico do token"}
              </button>
              {showLoginDebug ? (
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                      Dentro do token colado (JWT)
                    </p>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[10px] leading-snug text-amber-100/90">
                      {JSON.stringify(ac.loginDebug.jwtPayload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                      Valores usados pra assinar a requisição (sem o segredo)
                    </p>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[10px] leading-snug text-amber-100/90">
                      {JSON.stringify(ac.loginDebug.request, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {ac.devicesRawJson ? (
        <div>
          <button
            type="button"
            onClick={() => setShowRawJson((v) => !v)}
            className="text-[10px] font-semibold text-slate-600 hover:text-cyan-300"
          >
            {showRawJson ? "▾ esconder JSON da lista de impressoras" : "▸ ver JSON da lista de impressoras"}
          </button>
          {showRawJson ? (
            <pre className="mt-1.5 max-h-72 overflow-auto rounded-lg bg-slate-900/80 p-2 text-[10px] leading-snug text-slate-400">
              {JSON.stringify(ac.devicesRawJson, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      {ac.connected === null ? (
        <p className="text-sm text-slate-500">Verificando conexão...</p>
      ) : ac.connected ? (
        ac.devices.length === 0 ? (
          <p className="text-sm text-slate-500">Conectado, mas nenhuma impressora encontrada na conta.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ac.devices.map((d) => (
                <AnycubicCard key={d.devId} d={d} />
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void ac.handleDisconnect()}
                disabled={ac.loading}
                className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-900 disabled:opacity-60"
              >
                Desconectar conta Anycubic
              </button>
            </div>
          </>
        )
      ) : (
        <div className="glass-panel max-w-lg space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-100">Conectar Anycubic Kobra X</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-400">
            <li>No Windows, abra o Anycubic Slicer Next e faça login (deixe a tela da impressora aberta).</li>
            <li>
              Baixe os scripts{" "}
              <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-cyan-300">
                recover_slicer_token.ps1
              </code>{" "}
              e{" "}
              <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-cyan-300">
                recover_slicer_token.py
              </code>{" "}
              do projeto{" "}
              <a
                href="https://github.com/ljschmitt/hass-anycubic_cloud_v3/tree/master/scripts"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                hass-anycubic_cloud_v3
              </a>{" "}
              (os dois na mesma pasta) e rode o .ps1 no PowerShell.
            </li>
            <li>O token recuperado vai pro seu clipboard — cola ele no campo abaixo.</li>
          </ol>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="email"
              placeholder="E-mail da conta Anycubic"
              value={ac.email}
              onChange={(e) => ac.setEmail(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Token recuperado do Slicer Next"
              value={ac.slicerAccessToken}
              onChange={(e) => ac.setSlicerAccessToken(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void ac.handleLogin()}
            disabled={ac.loading || !ac.email || !ac.slicerAccessToken}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
          >
            {ac.loading ? "Conectando..." : "Conectar conta Anycubic"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function FarmPage() {
  const user = useAuthStore((s) => s.user);
  const farm = useBambuFarm(user?.id);
  const [showUidDebug, setShowUidDebug] = useState(false);
  const [showDevicesRawJson, setShowDevicesRawJson] = useState(false);
  const [showUidLookup, setShowUidLookup] = useState(false);

  const printing = farm.bambuDevices.filter(isActivelyPrinting).length;
  const online = farm.bambuDevices.filter((d) => d.online).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">Painel de Farm</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitoramento ao vivo das suas Bambu Lab — tempo restante, temperatura e camada de cada uma, direto
            daqui, não importa em qual ambiente elas estejam (usa a conta Bambu Cloud, não rede local).
          </p>
        </div>
        {farm.bambuConnected ? (
          <button
            type="button"
            onClick={() => void farm.refreshBambuDevices()}
            disabled={farm.bambuLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${farm.bambuLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        ) : null}
      </div>

      {farm.bambuConnected && !farm.accountHasUid ? (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Ainda não achei o uid da sua conta — já tentei 3 jeitos diferentes, nenhum bateu.
              Progresso/temperatura/tempo continuam indisponíveis (o "imprimindo agora" básico já funciona,
              só isso que falta).
            </p>
            <button
              type="button"
              onClick={() => void farm.handleBambuDisconnect()}
              disabled={farm.bambuLoading}
              className="shrink-0 rounded-lg border border-amber-500/40 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
            >
              Desconectar agora
            </button>
          </div>
          {farm.uidLookupDebug && farm.uidLookupDebug.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUidLookup((v) => !v)}
                className="text-[11px] font-semibold text-amber-300 hover:text-amber-100"
              >
                {showUidLookup ? "▾ esconder tentativas" : "▸ ver o que cada endpoint respondeu"}
              </button>
              {showUidLookup ? (
                <div className="mt-2 space-y-2">
                  {farm.uidLookupDebug.map((attempt, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                        {attempt.endpoint} — status {attempt.status}
                      </p>
                      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[10px] leading-snug text-amber-100/90">
                        {attempt.body || "(corpo vazio)"}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {farm.devicesRawJson ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="font-semibold">
            JSON real da lista de impressoras (pode ter um campo de conta/uid que eu ainda não estou lendo).
          </p>
          <button
            type="button"
            onClick={() => setShowDevicesRawJson((v) => !v)}
            className="mt-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-100"
          >
            {showDevicesRawJson ? "▾ esconder JSON" : "▸ ver JSON da lista de impressoras"}
          </button>
          {showDevicesRawJson ? (
            <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[10px] leading-snug text-amber-100/90">
              {JSON.stringify(farm.devicesRawJson, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      {farm.bambuUidDebug ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="font-semibold">
            O login funcionou, mas não achei o campo certo com o uid — isso aqui é o JSON real que a Bambu
            respondeu (sem o token em si). Manda um print dessa caixa aberta que eu ajusto certeiro.
          </p>
          <button
            type="button"
            onClick={() => setShowUidDebug((v) => !v)}
            className="mt-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-100"
          >
            {showUidDebug ? "▾ esconder JSON" : "▸ ver JSON do login"}
          </button>
          {showUidDebug ? (
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                  Resposta do login
                </p>
                <pre className="mt-1 max-h-56 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[10px] leading-snug text-amber-100/90">
                  {JSON.stringify(farm.bambuUidDebug.loginJson, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                  Dentro do token (JWT)
                </p>
                <pre className="mt-1 max-h-56 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[10px] leading-snug text-amber-100/90">
                  {JSON.stringify(farm.bambuUidDebug.jwtPayload, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {farm.bambuConnected && farm.bambuDevices.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Impressoras</p>
            <p className="mt-0.5 text-lg font-bold text-slate-50">{farm.bambuDevices.length}</p>
          </div>
          <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-emerald-400">Online</p>
            <p className="mt-0.5 text-lg font-bold text-slate-50">{online}</p>
          </div>
          <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-cyan-400">Imprimindo agora</p>
            <p className="mt-0.5 text-lg font-bold text-slate-50">{printing}</p>
          </div>
          <div className="glass-panel rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Ociosas</p>
            <p className="mt-0.5 text-lg font-bold text-slate-50">{online - printing}</p>
          </div>
        </div>
      ) : null}

      {farm.bambuError ? (
        <p className="whitespace-pre-wrap rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {farm.bambuError}
        </p>
      ) : null}

      {farm.bambuConnected === null ? (
        <p className="text-sm text-slate-500">Verificando conexão...</p>
      ) : farm.bambuConnected ? (
        farm.bambuDevices.length === 0 ? (
          <p className="text-sm text-slate-500">Conectado, mas nenhuma impressora encontrada na conta.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {farm.bambuDevices.map((d) => (
                <PrinterCard key={d.devId} d={d} />
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void farm.handleBambuDisconnect()}
                disabled={farm.bambuLoading}
                className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-900 disabled:opacity-60"
              >
                Desconectar conta Bambu Lab
              </button>
            </div>
          </>
        )
      ) : (
        <div className="glass-panel max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-100">Conectar conta Bambu Lab</p>
          <p className="text-xs text-slate-500">
            Recurso experimental, nunca testado contra uma conta real antes — se der algum erro estranho, me manda
            a mensagem que aparecer aqui que eu ajusto.
          </p>
          {!farm.bambuNeedsCode ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="email"
                  placeholder="E-mail da conta Bambu Lab"
                  value={farm.bambuEmail}
                  onChange={(e) => farm.setBambuEmail(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={farm.bambuPassword}
                  onChange={(e) => farm.setBambuPassword(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => void farm.handleBambuLogin()}
                disabled={farm.bambuLoading || !farm.bambuEmail || !farm.bambuPassword}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                {farm.bambuLoading ? "Conectando..." : "Conectar conta Bambu Lab"}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Código recebido por e-mail"
                value={farm.bambuCode}
                onChange={(e) => farm.setBambuCode(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => void farm.handleBambuVerify()}
                disabled={farm.bambuLoading || !farm.bambuCode}
                className="ml-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                {farm.bambuLoading ? "Confirmando..." : "Confirmar código"}
              </button>
            </>
          )}
        </div>
      )}

      <AnycubicSection />
    </div>
  );
}
