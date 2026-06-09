"use client";

/**
 * Cliente dos serviços de enriquecimento.
 * Chama os Route Handlers do próprio ERP (/api/enrich/*), que validam a sessão
 * e fazem proxy para o serviço externo. Toda falha retorna null — o autocomplete
 * é não-bloqueante: se o serviço estiver offline ou não configurado, o usuário
 * preenche manualmente.
 */

export type CepData = { cep: string; city: string; state: string; country: string };
export type EmpresaData = {
  cnpj: string;
  name: string;
  tradeName: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
  cep: string;
  phone: string;
  email: string;
};
export type NcmItem = { code: string; description: string };
export type BarcodeData = { ean: string; name: string; brand: string; category: string };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function lookupCep(cep: string): Promise<CepData | null> {
  return getJson<CepData>(`/api/enrich/cep?cep=${encodeURIComponent(cep)}`);
}

export function lookupEmpresa(cnpj: string): Promise<EmpresaData | null> {
  return getJson<EmpresaData>(`/api/enrich/empresa?cnpj=${encodeURIComponent(cnpj)}`);
}

export async function searchNcm(q: string): Promise<NcmItem[]> {
  const data = await getJson<{ results: NcmItem[] }>(`/api/enrich/ncm?q=${encodeURIComponent(q)}`);
  return data?.results ?? [];
}

export function lookupBarcode(ean: string): Promise<BarcodeData | null> {
  return getJson<BarcodeData>(`/api/enrich/barcode?ean=${encodeURIComponent(ean)}`);
}
