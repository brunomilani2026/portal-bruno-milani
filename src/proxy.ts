import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, tokenValido } from "@/lib/session";

const PUBLICOS = ["/login", "/logo.png", "/favicon.ico", "/robots.txt", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICOS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  if (tokenValido(req.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
