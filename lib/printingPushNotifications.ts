/**
 * Notificações do sistema (push local) para avisos de impressão.
 * Requer permissão do browser; não substitui Web Push com servidor.
 */

const DISMISS_KEY = "precifica3d-printing-push-dismissed";

export function wasPrintingPushPromptDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissPrintingPushPrompt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, "1");
}

export function printingNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPrintingNotificationPermission(): Promise<NotificationPermission> {
  if (!printingNotificationsSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showPrintingPushNotification(
  phase: "warn" | "end",
  productName: string,
  orderId: string,
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title =
    phase === "warn" ? "Impressão quase no fim" : "Tempo de impressão encerrado";
  const body =
    phase === "warn"
      ? `Faltam cerca de 5 minutos para o fim do tempo estimado de "${productName}".`
      : `Tempo estimado de impressão concluído para "${productName}". Confira a peça na máquina.`;

  const options: NotificationOptions = {
    body,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: `printing-${orderId}-${phase}`,
  };

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, options);
  } catch {
    try {
      new Notification(title, { body: options.body, icon: options.icon });
    } catch {
      // ignora
    }
  }
}
