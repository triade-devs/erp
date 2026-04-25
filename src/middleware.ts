import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ACTIVE_COMPANY_SLUG_COOKIE } from "@/core/config/cookies";

const PUBLIC_ROUTES = ["/login", "/register", "/recover", "/api/auth/callback", "/accept-invite"];

export async function middleware(request: NextRequest) {
  // Generate or forward x-request-id for observability
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Sempre chamar getUser para refresh do token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));

  // 1. Verificação de autenticação (deve acontecer antes de qualquer redirect)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("x-request-id", requestId);
    return redirectResponse;
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    redirectResponse.headers.set("x-request-id", requestId);
    return redirectResponse;
  }

  // 2. Redireciona rotas legadas /inventory/* para /<companySlug>/inventory/*
  // (só chega aqui se autenticado)
  if (pathname === "/inventory" || pathname.startsWith("/inventory/")) {
    const slug = request.cookies.get(ACTIVE_COMPANY_SLUG_COOKIE)?.value;
    const rest = pathname.slice("/inventory".length); // ex: "/new", "/[id]", ""
    const destination = slug ? `/${slug}/inventory${rest}` : "/";
    const url = request.nextUrl.clone();
    url.pathname = destination;
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("x-request-id", requestId);
    return redirectResponse;
  }

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)"],
};
