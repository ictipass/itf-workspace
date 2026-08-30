import { auth } from "@/auth";
import {
  isPasswordChangePath,
  isPublicWorkspacePath,
} from "@/lib/auth/route-access-policy";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;

  const isPublicRoute = isPublicWorkspacePath(nextUrl.pathname);
  const isPasswordRoute = isPasswordChangePath(nextUrl.pathname);

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
