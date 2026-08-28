import { getSupabaseExtensionClient } from "../lib/supabaseExtensionClient";
import { activeShopeePreset, type MinimalUserSettings } from "../lib/settingsTypes";
import type { AuthState, ExtensionMessage, ShopeeContext } from "../lib/messaging";

/**
 * Background (service worker) — único lugar que fala com o Supabase. Content
 * scripts e popup pedem dados por mensagem em vez de terem seu próprio client,
 * pra manter uma única fonte de verdade pra sessão/preset em toda a extensão.
 */

async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseExtensionClient();
  if (!supabase) return { status: "signed_out" };
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user?.email;
  return email ? { status: "signed_in", email } : { status: "signed_out" };
}

async function signIn(email: string, password: string) {
  const supabase = getSupabaseExtensionClient();
  if (!supabase) return { ok: false as const, error: "Supabase não configurado." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

async function signOut() {
  const supabase = getSupabaseExtensionClient();
  await supabase?.auth.signOut();
  return { ok: true as const };
}

async function getShopeeContext(): Promise<ShopeeContext> {
  const supabase = getSupabaseExtensionClient();
  if (!supabase) return { status: "signed_out" };

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return { status: "signed_out" };

  const { data, error } = await supabase
    .from("user_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.data) return { status: "no_preset" };

  const preset = activeShopeePreset(data.data as MinimalUserSettings);
  if (!preset) return { status: "no_preset" };
  return { status: "ok", preset };
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_AUTH_STATE":
        sendResponse(await getAuthState());
        break;
      case "SIGN_IN":
        sendResponse(await signIn(message.email, message.password));
        break;
      case "SIGN_OUT":
        sendResponse(await signOut());
        break;
      case "GET_SHOPEE_CONTEXT":
        sendResponse(await getShopeeContext());
        break;
      case "OPEN_POPUP_TAB": {
        // Usa o caminho que o manifest realmente aponta (o build do CRXJS pode
        // reescrever o path de "src/popup/index.html" pra outro em produção).
        const popupPath = chrome.runtime.getManifest().action?.default_popup ?? "src/popup/index.html";
        await chrome.tabs.create({ url: chrome.runtime.getURL(`${popupPath}${message.path ?? ""}`) });
        sendResponse();
        break;
      }
    }
  })();
  return true; // mantém o canal aberto pra resposta assíncrona
});

// Menu de contexto em imagens: como não existe API pública de busca reversa
// do MakerWorld, a v1 abre o Google Lens apontando pra imagem — ele já indexa
// o MakerWorld e costuma achar o modelo/similar em poucos cliques.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "buscar-modelo-similar",
    title: "Buscar modelo 3D semelhante (Google Lens)",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "buscar-modelo-similar" || !info.srcUrl) return;
  const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(info.srcUrl)}`;
  chrome.tabs.create({ url: lensUrl });
});
