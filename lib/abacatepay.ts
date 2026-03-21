/**
 * Cliente AbacatePay – cobranças PIX e Cartão.
 * Baseado no guia: https://docs.abacatepay.com
 */

const API_BASE = "https://api.abacatepay.com";
const API_V2_CHECKOUT_CREATE = `${API_BASE}/v2/checkouts/create`;

export interface AbacatePayCustomer {
  name: string;
  cellphone: string;
  email: string;
  taxId: string;
}

export interface AbacatePayBillingProduct {
  externalId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number; // centavos
}

export interface AbacatePayCreateBillingParams {
  frequency: "ONE_TIME" | "MULTIPLE_PAYMENTS";
  methods: ("PIX" | "CARD")[];
  products: AbacatePayBillingProduct[];
  returnUrl: string;
  completionUrl: string;
  customerId?: string;
  customer?: AbacatePayCustomer;
  /** Ex.: { app_user_email } para cruzar com o login no /api/account/access */
  metadata?: Record<string, string>;
}

export interface AbacatePayBillingResponse {
  id: string;
  url: string;
  amount: number;
  status: string;
  devMode?: boolean;
}

async function requestResolved<T>(
  token: string,
  resolvedUrl: string,
  options: RequestInit = {},
): Promise<{ data: T; error: unknown }> {
  const res = await fetch(resolvedUrl, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const raw = await res.text();
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    throw new Error(
      `AbacatePay retornou corpo vazio (HTTP ${res.status} ${res.statusText}). Verifique token, rede e URL da API.`
    );
  }
  let json: { data: T; error: unknown };
  try {
    json = JSON.parse(trimmed) as { data: T; error: unknown };
  } catch {
    throw new Error(
      res.ok
        ? "Resposta inválida da API AbacatePay (não é JSON)."
        : `AbacatePay (${res.status}): ${trimmed.slice(0, 500)}`
    );
  }
  if (!res.ok) {
    const err = json.error;
    const msg =
      typeof err === "string"
        ? err
        : err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : null;
    throw new Error(msg ?? `Erro na API AbacatePay (${res.status})`);
  }
  return json;
}

async function request<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; error: unknown }> {
  return requestResolved<T>(token, `${API_BASE}${path}`, options);
}

/** Checkout v2 — usa produtos já cadastrados na loja (ID tipo prod_...). */
export interface AbacatePayCreateCheckoutV2Params {
  items: { id: string; quantity: number }[];
  methods?: ("PIX" | "CARD")[];
  returnUrl: string;
  completionUrl: string;
  customerId?: string;
  externalId?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutV2(
  token: string,
  params: AbacatePayCreateCheckoutV2Params,
): Promise<AbacatePayBillingResponse> {
  const payload: Record<string, unknown> = {
    items: params.items,
    methods: params.methods ?? ["PIX", "CARD"],
    returnUrl: params.returnUrl,
    completionUrl: params.completionUrl,
  };
  if (params.customerId) payload.customerId = params.customerId;
  if (params.externalId) payload.externalId = params.externalId;
  if (params.metadata && Object.keys(params.metadata).length > 0) {
    payload.metadata = params.metadata;
  }

  const { data } = await requestResolved<AbacatePayBillingResponse>(
    token,
    API_V2_CHECKOUT_CREATE,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data;
}

export async function createCustomer(
  token: string,
  customer: AbacatePayCustomer
): Promise<{ id: string }> {
  const { data } = await request<{ id: string; metadata: AbacatePayCustomer }>(
    token,
    "/v1/customer/create",
    {
      method: "POST",
      body: JSON.stringify(customer),
    }
  );
  return { id: data.id };
}

export async function createBilling(
  token: string,
  params: AbacatePayCreateBillingParams
): Promise<AbacatePayBillingResponse> {
  const { data } = await request<AbacatePayBillingResponse>(
    token,
    "/v1/billing/create",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return data;
}

/** Cobrança retornada em GET /v1/billing/list (campos variam; usamos os que existirem). */
export type AbacatePayBillingListItem = {
  id: string;
  status?: string;
  customer?: {
    metadata?: { email?: string; name?: string };
    email?: string;
  } | null;
  metadata?: Record<string, unknown>;
  products?: Array<{ id?: string; externalId?: string }>;
  nextBilling?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

/**
 * Lista cobranças da loja. Exige permissão BILLING:READ na chave.
 * GET sem Content-Type para compatibilidade.
 */
export async function listBillings(token: string): Promise<AbacatePayBillingListItem[]> {
  const res = await fetch(`${API_BASE}/v1/billing/list`, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });
  const raw = await res.text();
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    throw new Error(
      `AbacatePay billing/list: corpo vazio (HTTP ${res.status}). Verifique BILLING:READ na chave.`
    );
  }
  let json: { data: AbacatePayBillingListItem[] | null; error: unknown };
  try {
    json = JSON.parse(trimmed) as { data: AbacatePayBillingListItem[] | null; error: unknown };
  } catch {
    throw new Error(`AbacatePay billing/list (${res.status}): resposta não é JSON.`);
  }
  if (!res.ok) {
    const err = json.error;
    const msg =
      typeof err === "string"
        ? err
        : err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : null;
    throw new Error(msg ?? `Erro billing/list (${res.status})`);
  }
  const arr = json.data;
  return Array.isArray(arr) ? arr : [];
}
