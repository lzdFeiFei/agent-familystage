import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const { id } = await context.params;
  const session = await prisma.chatSession.findUnique({
    where: { id },
    select: {
      id: true,
      viewerUserId: true,
      roleKey: true,
      scenarioKey: true,
      status: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sender: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session || session.viewerUserId !== user.id) {
    return NextResponse.json({ code: 404, message: "会话不存在", data: null }, { status: 404 });
  }

  return NextResponse.json({
    code: 0,
    data: {
      sessionId: session.id,
      roleKey: session.roleKey,
      scenarioKey: session.scenarioKey,
      status: session.status,
      messages: session.messages,
    },
  });
}
