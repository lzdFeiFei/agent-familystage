import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchUserInfo } from "@/lib/secondme";
import { getSessionUserId } from "@/lib/session";

function safeRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ code: 404, message: "用户不存在", data: null }, { status: 404 });
  }

  try {
    const upstream = await fetchUserInfo(user.accessToken);
    const data = safeRecord(safeRecord(upstream).data ?? upstream);
    await prisma.user.update({
      where: { id: userId },
      data: {
        nickname: safeString(data.nickname || data.name) || user.nickname,
        avatarUrl: safeString(data.avatar || data.avatar_url) || user.avatarUrl,
        softMemory: toJsonValue(data.softmemory ?? data.soft_memory),
      },
    });
    return NextResponse.json(upstream);
  } catch (error) {
    console.error("Fetch user info failed:", error);
    return NextResponse.json(
      { code: 5001, message: "获取用户信息失败", data: null },
      { status: 500 },
    );
  }
}
