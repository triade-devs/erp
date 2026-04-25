// Re-exporta a partir do arquivo de configuração central para manter compatibilidade.
// O arquivo core/config/cookies.ts pode ser importado no Edge Runtime (middleware),
// enquanto este arquivo de constantes do módulo tenancy é apenas para uso interno.
export { ACTIVE_COMPANY_COOKIE, ACTIVE_COMPANY_SLUG_COOKIE } from "@/core/config/cookies";
