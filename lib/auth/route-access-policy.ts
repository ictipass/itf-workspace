const EXACT_PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/session-recovery",
  "/api/integrations/workspace/v2/jwks",
]);

const PUBLIC_PATH_PREFIXES = ["/api/auth"];

function isPathOrDescendant(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPublicWorkspacePath(pathname: string) {
  return (
    EXACT_PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PATH_PREFIXES.some((route) => isPathOrDescendant(pathname, route))
  );
}

export function isPasswordChangePath(pathname: string) {
  return pathname === "/change-password";
}
