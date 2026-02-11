type JsonValue = Record<string, unknown>;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value.trim();
}

function normalizePath(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function getTokenEndpoints() {
  const configured = process.env.SECONDME_TOKEN_ENDPOINT;
  const baseUrl = requiredEnv("SECONDME_API_BASE_URL");
  const official = normalizePath(baseUrl, "/api/oauth/token/code");

  if (!configured) return [official];

  const normalizedConfigured = configured.replace(/\/$/, "");
  const list = [normalizedConfigured];

  // 文档要求使用 /api/oauth/token/code，旧配置 /api/oauth/token 会 404。
  if (normalizedConfigured.endsWith("/api/oauth/token")) {
    list.push(`${normalizedConfigured}/code`);
  }

  if (!list.includes(official)) {
    list.push(official);
  }

  return list;
}

function getChatEndpoints() {
  const baseUrl = requiredEnv("SECONDME_API_BASE_URL");
  const official = normalizePath(baseUrl, "/api/secondme/chat/stream");
  const configured = process.env.SECONDME_CHAT_ENDPOINT;
  if (!configured) return [official];

  const normalized = configured.startsWith("http")
    ? configured.replace(/\/$/, "")
    : normalizePath(baseUrl, configured);
  const list = [normalized];

  if (normalized.endsWith("/api/secondme/chat")) {
    list.push(`${normalized}/stream`);
  }
  if (!list.includes(official)) {
    list.push(official);
  }
  return list;
}

function parseSseReply(raw: string) {
  const lines = raw.split(/\r?\n/);
  const chunks: string[] = [];
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload) as JsonValue;
      const choices = parsed.choices as Array<{ delta?: { content?: string } }> | undefined;
      const piece = choices?.[0]?.delta?.content;
      if (piece) chunks.push(piece);
    } catch {
      // ignore non-json SSE lines
    }
  }
  return chunks.join("").trim();
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
  const clientId = requiredEnv("SECONDME_CLIENT_ID");
  const clientSecret = requiredEnv("SECONDME_CLIENT_SECRET");
  const redirectUri = requiredEnv("SECONDME_REDIRECT_URI");
  const endpoints = getTokenEndpoints();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  let lastError = "Token endpoint request failed";
  let result: JsonValue | null = null;
  let usedEndpoint = "";

  for (const endpoint of endpoints) {
    usedEndpoint = endpoint;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });

    let json: JsonValue = {};
    try {
      json = (await response.json()) as JsonValue;
    } catch {
      json = {};
    }

    if (response.ok) {
      result = json;
      break;
    }

    lastError = `Token endpoint failed: ${response.status} (${endpoint})`;
  }

  if (!result) {
    throw new Error(lastError);
  }

  if (typeof result.code === "number" && result.code !== 0) {
    throw new Error(
      `Token endpoint error code: ${String(result.code)} (${usedEndpoint})`,
    );
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
  if (typeof data.code === "number" && data.code !== 0) {
    throw new Error(`SecondMe API error code: ${String(data.code)}`);
  }
  return data;
}

export async function fetchUserInfo(accessToken: string) {
  return requestSecondMe("/api/secondme/user/info", accessToken);
}

export async function fetchUserShades(accessToken: string) {
  return requestSecondMe("/api/secondme/user/shades", accessToken);
}

export async function sendRoleplayChat(
  accessToken: string,
  params: {
    roleLabel: string;
    scenarioLabel: string;
    message: string;
  },
) {
  const prompt = `你现在扮演春节家庭场景里的${params.roleLabel}。风格：轻度魔幻但不辱骂、不过界。当前话题：${params.scenarioLabel}。用户消息：${params.message}`;
  const payload = { message: prompt };
  const endpoints = getChatEndpoints();

  let lastError = "SecondMe chat request failed";

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    if (!response.ok) {
      lastError = `SecondMe chat failed: ${response.status} (${endpoint})`;
      continue;
    }

    if (contentType.includes("text/event-stream")) {
      const sseReply = parseSseReply(rawText);
      if (sseReply) {
        return {
          raw: rawText,
          reply: sseReply,
        };
      }
    } else {
      try {
        const json = JSON.parse(rawText) as JsonValue;
        const result = (json.data as JsonValue | undefined) ?? json;
        const reply =
          (result.reply as string | undefined) ||
          (result.content as string | undefined) ||
          (result.message as string | undefined) ||
          "";
        if (reply) {
          return {
            raw: json,
            reply,
          };
        }
      } catch {
        // ignore parse error and continue trying fallback endpoints
      }
    }

    lastError = `SecondMe chat response missing reply (${endpoint})`;
  }

  throw new Error(lastError);
}
