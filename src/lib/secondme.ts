type JsonValue = Record<string, unknown>;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function normalizePath(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function getScopes() {
  return (process.env.SECONDME_SCOPES || "user.info")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

export function buildOAuthAuthorizeUrl(state: string) {
  const oauthBase = requiredEnv("SECONDME_OAUTH_URL");
  const clientId = requiredEnv("SECONDME_CLIENT_ID");
  const redirectUri = requiredEnv("SECONDME_REDIRECT_URI");

  const url = new URL(oauthBase);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getScopes());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(code: string) {
  const endpoint = requiredEnv("SECONDME_TOKEN_ENDPOINT");
  const clientId = requiredEnv("SECONDME_CLIENT_ID");
  const clientSecret = requiredEnv("SECONDME_CLIENT_SECRET");
  const redirectUri = requiredEnv("SECONDME_REDIRECT_URI");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const result = (await response.json()) as JsonValue;
  if (!response.ok) {
    throw new Error(`Token endpoint failed: ${response.status}`);
  }
  if (typeof result.code === "number" && result.code !== 0) {
    throw new Error(`Token endpoint error code: ${String(result.code)}`);
  }

  const payload = (result.data as JsonValue | undefined) ?? result;
  const accessToken =
    (payload.access_token as string | undefined) ||
    (payload.accessToken as string | undefined);
  const refreshToken =
    (payload.refresh_token as string | undefined) ||
    (payload.refreshToken as string | undefined) ||
    "";
  const expiresIn =
    Number(payload.expires_in ?? payload.expiresIn ?? 7200) || 7200;
  const secondmeUserId =
    String(payload.user_id ?? payload.userId ?? payload.sub ?? "");

  if (!accessToken) {
    throw new Error("Token response missing access token");
  }

  return {
    accessToken,
    refreshToken,
    expiresIn,
    secondmeUserId,
  };
}

async function requestSecondMe(path: string, accessToken: string) {
  const baseUrl = requiredEnv("SECONDME_API_BASE_URL");
  const url = normalizePath(baseUrl, path);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json()) as JsonValue;
  if (!response.ok) {
    throw new Error(`SecondMe API failed: ${response.status}`);
  }
  return data;
}

export async function fetchUserInfo(accessToken: string) {
  return requestSecondMe("/api/secondme/user/info", accessToken);
}

export async function fetchUserShades(accessToken: string) {
  return requestSecondMe("/api/secondme/user/shades", accessToken);
}
