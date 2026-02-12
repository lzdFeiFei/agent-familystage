import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, fetchUserInfo } from "@/lib/secondme";
import { consumeOAuthState, setSessionCookie } from "@/lib/session";

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const callbackState = request.nextUrl.searchParams.get("state");
  const storedState = await consumeOAuthState();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  if (!storedState || callbackState !== storedState) {
    console.warn("SecondMe OAuth state mismatch, continue for WebView compatibility.");
  }

  try {
    const token = await exchangeCodeForToken(code);
    let userInfoData: Record<string, unknown> = {};
    try {
      const userInfoResponse = await fetchUserInfo(token.accessToken);
      userInfoData = safeRecord(safeRecord(userInfoResponse).data ?? userInfoResponse);
    } catch (error) {
      console.warn("SecondMe user/info failed, continue login with token data:", error);
    }

    const secondmeUserId =
      token.secondmeUserId ||
      safeString(userInfoData.user_id) ||
      safeString(userInfoData.userId) ||
      safeString(userInfoData.id) ||
      safeString(userInfoData.route) ||
      safeString(userInfoData.email) ||
      `token_${crypto.createHash("sha256").update(token.accessToken).digest("hex").slice(0, 24)}`;

    if (!secondmeUserId) {
      return NextResponse.redirect(new URL("/login?error=missing_user", request.url));
    }

    const expiresAt = new Date(Date.now() + token.expiresIn * 1000);
    const user = await prisma.user.upsert({
      where: { secondmeUserId },
        create: {
          secondmeUserId,
          nickname: safeString(userInfoData.nickname || userInfoData.name) || null,
          avatarUrl: safeString(userInfoData.avatar || userInfoData.avatar_url) || null,
          softMemory: toJsonValue(userInfoData.softmemory ?? userInfoData.soft_memory),
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt: expiresAt,
        },
        update: {
          nickname: safeString(userInfoData.nickname || userInfoData.name) || null,
          avatarUrl: safeString(userInfoData.avatar || userInfoData.avatar_url) || null,
          softMemory: toJsonValue(userInfoData.softmemory ?? userInfoData.soft_memory),
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt: expiresAt,
      },
    });

    await prisma.agentProfile.upsert({
      where: { ownerUserId: user.id },
      create: {
        ownerUserId: user.id,
        consentStatus: "ACTIVE",
        visibility: "PUBLIC",
      },
      update: {
        consentStatus: "ACTIVE",
        visibility: "PUBLIC",
        revokedAt: null,
      },
    });

    await setSessionCookie(user.id);
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("SecondMe callback failed:", error);
    const reason = encodeURIComponent(
      error instanceof Error ? error.message.slice(0, 120) : "unknown_error",
    );
    return NextResponse.redirect(new URL(`/login?error=oauth_failed&reason=${reason}`, request.url));
  }
}
