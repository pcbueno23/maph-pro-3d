/** Tema claro/escuro da extensão — uma preferência só, compartilhada por todos os cards/painéis (mini-card, card do anúncio, Raio-X, modal de login, popup). */
export type Theme = "dark" | "light";

const THEME_KEY = "mp3d_theme";

export async function getTheme(): Promise<Theme> {
  try {
    const r = await chrome.storage.local.get(THEME_KEY);
    return r[THEME_KEY] === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export async function setTheme(theme: Theme): Promise<void> {
  try {
    await chrome.storage.local.set({ [THEME_KEY]: theme });
  } catch {
    /* ignora — pior caso, a preferência não persiste */
  }
}

export async function toggleTheme(): Promise<Theme> {
  const current = await getTheme();
  const next: Theme = current === "dark" ? "light" : "dark";
  await setTheme(next);
  return next;
}

/** Reage quando o tema muda em QUALQUER card/painel (ex.: alternou no card do anúncio, o Raio-X também precisa atualizar). */
export function onThemeChange(cb: (theme: Theme) => void): () => void {
  const handler = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== "local" || !(THEME_KEY in changes)) return;
    cb(changes[THEME_KEY].newValue === "light" ? "light" : "dark");
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
