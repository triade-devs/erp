import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/core/config/env";

export async function GET(request: Request) {
  if (!env.ENRICHMENT_EMPRESA_URL) {
    return NextResponse.json({ error: "Serviço não configurado" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cnpj = searchParams.get("cnpj") ?? "";

  const upstream = await fetch(
    `${env.ENRICHMENT_EMPRESA_URL}/empresa/${encodeURIComponent(cnpj)}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } },
  );

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
