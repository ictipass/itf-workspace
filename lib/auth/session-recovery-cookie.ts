import "server-only";

import { cookies } from "next/headers";

const COOKIE_NAME = "itf_workspace_session_recovery";

export async function setSessionRecoveryCookie(token: string, expires: Date) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/session-recovery",
    expires,
  });
}

export async function getSessionRecoveryCookie() {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function clearSessionRecoveryCookie() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/session-recovery",
    maxAge: 0,
  });
}
