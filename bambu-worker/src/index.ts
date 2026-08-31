import { listBambuAccounts } from "./supabase.js";
import { syncAccounts, activeConnectionCount } from "./bambuMqtt.js";

const POLL_INTERVAL_MS = 60_000;

async function tick() {
  try {
    const accounts = await listBambuAccounts();
    await syncAccounts(accounts);
    console.log(`[worker] ${accounts.length} conta(s) na tabela, ${activeConnectionCount()} conexão(ões) ativa(s).`);
  } catch (err) {
    console.error("[worker] falha no ciclo de sincronização:", err);
  }
}

console.log("[worker] bambu-worker iniciando...");
void tick();
setInterval(tick, POLL_INTERVAL_MS);

process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM recebido, encerrando.");
  process.exit(0);
});
