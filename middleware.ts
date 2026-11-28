import { SUPABASE_KEY, SUPABASE_READY, SUPABASE_URL } from "@/lib/supabase/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Páginas que podem ser abertas sem login
const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar-senha", "/auth", "/privacidade"];

export async function middleware(request: NextRequest) {
  // Sem as chaves do Supabase configuradas, mostra um aviso em vez de quebrar
  if (!SUPABASE_READY) {
    return new NextResponse(
      "<!doctype html><meta charset=utf-8><title>Agenda Aviva</title><body style='font-family:sans-serif;padding:32px'><h1>Agenda Aviva</h1><p>O app ainda está sendo configurado (faltam as chaves do Supabase na Vercel).</p></body>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Renova a sessão e confere o usuário no servidor do Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|.*\\.(?:png|jpg|jpeg|svg|webp|webmanifest)$).*)"],
};
