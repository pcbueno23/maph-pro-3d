import type { ShopeePreset } from "./settingsTypes";

export type AuthState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; email: string };

export type ShopeeContext =
  | { status: "signed_out" }
  | { status: "no_preset" }
  | { status: "ok"; preset: ShopeePreset };

/** Todas as mensagens trocadas entre popup/content scripts e o background. */
export type ExtensionMessage =
  | { type: "GET_AUTH_STATE" }
  | { type: "SIGN_IN"; email: string; password: string }
  | { type: "SIGN_OUT" }
  | { type: "GET_SHOPEE_CONTEXT" }
  | { type: "OPEN_POPUP_TAB"; path?: string };

export type ExtensionResponse<M extends ExtensionMessage["type"]> = M extends "GET_AUTH_STATE"
  ? AuthState
  : M extends "SIGN_IN"
    ? { ok: true } | { ok: false; error: string }
    : M extends "SIGN_OUT"
      ? { ok: true }
      : M extends "GET_SHOPEE_CONTEXT"
        ? ShopeeContext
        : void;

export function sendToBackground<M extends ExtensionMessage>(
  message: M,
): Promise<ExtensionResponse<M["type"]>> {
  return chrome.runtime.sendMessage(message);
}
