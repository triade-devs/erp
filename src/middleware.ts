import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ACTIVE_COMPANY_SLUG_COOKIE } from "@/core/config/cookies";

const PUBLIC_ROUTES = ["/login", "/register", "/recover", "/api/auth/callback", "/accept-invite"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

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
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Redireciona rotas legadas /inventory/* para /<companySlug>/inventory/*
  // (só chega aqui se autenticado)
  if (pathname === "/inventory" || pathname.startsWith("/inventory/")) {
    const slug = request.cookies.get(ACTIVE_COMPANY_SLUG_COOKIE)?.value;
    const rest = pathname.slice("/inventory".length); // ex: "/new", "/[id]", ""
    const destination = slug ? `/${slug}/inventory${rest}` : "/";
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)"],
};
