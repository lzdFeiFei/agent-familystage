import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const session = await prisma.chatSession.findFirst({
    where: {
      viewerUserId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      roleKey: true,
      scenarioKey: true,
      status: true,
      updatedAt: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          content: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ code: 0, data: null });
  }

  return NextResponse.json({
    code: 0,
    data: {
      sessionId: session.id,
      roleKey: session.roleKey,
      scenarioKey: session.scenarioKey,
      status: session.status,
      updatedAt: session.updatedAt,
      lastMessage: session.messages[0]?.content || "",
    },
  });
}

