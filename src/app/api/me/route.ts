import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      secondmeUserId: true,
      nickname: true,
      avatarUrl: true,
      shades: true,
      softMemory: true,
      tokenExpiresAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ code: 404, message: "用户不存在", data: null }, { status: 404 });
  }

  return NextResponse.json({ code: 0, data: user });
}
