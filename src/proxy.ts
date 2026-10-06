import { NextResponse, type NextRequest } from "next/server";

/*
 * Verificação otimista: sem cookie de sessão, nem chega a renderizar a área privada.
 * A validação real (sessão no banco, expiração, perfil e permissões) acontece no servidor
 * em cada página, Server Action e rota de arquivo via requireUser().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/rh/login") return NextResponse.next();
  if (!request.cookies.get("ams_rh_session")?.value) {
    const url = new URL("/rh/login", request.url);
    if (pathname !== "/rh") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/rh", "/rh/:path*"],
};
