/**
 * Cliente REST da nuvem Bambu Lab, só a parte que o worker precisa (listar
 * impressoras). Mesma ressalva do lado do SaaS: API não documentada
 * oficialmente, mapeada por engenharia reversa de projetos open-source.
 */
const REGION_BASE: Record<string, string> = {
  global: "https://api.bambulab.com",
  china: "https://api.bambulab.cn",
};

function baseUrl(region: string): string {
  return REGION_BASE[region] ?? REGION_BASE.global;
}

export type BambuDevice = { devId: string; name: string; online: boolean };

export async function bambuListDevices(region: string, accessToken: string): Promise<BambuDevice[]> {
  const res = await fetch(`${baseUrl(region)}/v1/iot-service/api/user/bind`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error(`[bambuCloud] falha ao listar impressoras (${res.status}): ${await res.text()}`);
    return [];
  }
  const json: any = await res.json().catch(() => null);
  const list = Array.isArray(json?.devices) ? json.devices : [];
  return list.map((d: any) => ({
    devId: d.dev_id ?? d.devId ?? "",
    name: d.name ?? d.dev_name ?? "Impressora Bambu",
    online: Boolean(d.online ?? d.dev_online),
  }));
}
