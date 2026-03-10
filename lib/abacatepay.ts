/**
 * Cliente AbacatePay – cobranças PIX e Cartão.
 * Baseado no guia: https://docs.abacatepay.com
 */

const API_BASE = "https://api.abacatepay.com";

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
}

export interface AbacatePayBillingResponse {
  id: string;
  url: string;
  amount: number;
  status: string;
  devMode?: boolean;
}

async function request<T>(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; error: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const json = (await res.json()) as { data: T; error: unknown };
  if (!res.ok) {
    throw new Error(
      (json.error as { message?: string })?.message ?? "Erro na API AbacatePay"
    );
  }
  return json;
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
