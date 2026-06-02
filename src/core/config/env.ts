import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().optional(),
  // Serviços de enriquecimento (opcionais — funcionalidade de autocomplete fica desabilitada se ausentes)
  ENRICHMENT_NCM_URL: z.string().url().optional(),
  ENRICHMENT_EMPRESA_URL: z.string().url().optional(),
  ENRICHMENT_CEP_URL: z.string().url().optional(),
  ENRICHMENT_BARCODE_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  ENRICHMENT_NCM_URL: process.env.ENRICHMENT_NCM_URL,
  ENRICHMENT_EMPRESA_URL: process.env.ENRICHMENT_EMPRESA_URL,
  ENRICHMENT_CEP_URL: process.env.ENRICHMENT_CEP_URL,
  ENRICHMENT_BARCODE_URL: process.env.ENRICHMENT_BARCODE_URL,
});
