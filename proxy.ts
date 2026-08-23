import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/", "/login", "/session-recovery", "/api/auth"];
const passwordRoutes = ["/change-password"];

export default auth((req) => {
  const { nextUrl } = req;

  const isPublicRoute = publicRoutes.some((route) =>
    route === "/" ? nextUrl.pathname === "/" : nextUrl.pathname.startsWith(route)
  );

  const isPasswordRoute = passwordRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const isAuthenticated = !!req.auth;

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  const isTemporaryPassword = req.auth?.user?.isTemporaryPassword;

  if (isTemporaryPassword && !isPasswordRoute) {
    return NextResponse.redirect(new URL("/change-password", nextUrl.origin));
  }

  if (!isTemporaryPassword && isPasswordRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
