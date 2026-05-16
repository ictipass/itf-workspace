const WORKSPACE_LAUNCH_TOKEN_PARAM = "workspace_launch_token";

export function normalizeAppLaunchUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("App URL must use http or https.");
  }

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.searchParams.delete(WORKSPACE_LAUNCH_TOKEN_PARAM);

  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  }

  return url.toString();
}

export function appendWorkspaceLaunchToken(appUrl: string, token: string) {
  const launchUrl = new URL(appUrl);
  launchUrl.searchParams.set(WORKSPACE_LAUNCH_TOKEN_PARAM, token);
  return launchUrl.toString();
}
