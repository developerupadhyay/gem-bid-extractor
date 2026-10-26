import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and internal next requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/api/auth/login"
  ) {
    return NextResponse.next();
  }

  const expectedPass = process.env.ADMIN_PASSWORD;
  const authSecret = process.env.AUTH_SECRET || `${expectedPass || "secret"}_secret_signing_key_32bytes`;

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await verifySessionToken(token, authSecret) : false;

  // If already logged in and trying to view /login, redirect to home
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // If NOT authenticated
  if (!isAuthenticated) {
    // For API routes, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication session required." },
        { status: 401 }
      );
    }
    // For pages, redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
