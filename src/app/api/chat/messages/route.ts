import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { generateAgentReply } from "@/lib/roleplay";
import { checkSafety, maskSensitiveContent } from "@/lib/safety";

type MessageInput = {
  sessionId?: string;
  content?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const body = (await request.json()) as MessageInput;
  const content = (body.content || "").trim();
  if (!body.sessionId || !content) {
    return NextResponse.json(
      { code: 400, message: "sessionId 与 content 必填", data: null },
      { status: 400 },
    );
  }

  const safety = checkSafety(content);
  if (safety.blocked) {
    return NextResponse.json({
      code: 4001,
      message: "消息包含敏感内容，请换个说法",
      data: { safetyFlags: safety.matched },
    });
  }

  const session = await prisma.chatSession.findUnique({
    where: { id: body.sessionId },
    include: {
      agentProfile: {
        include: {
          owner: {
            select: {
              accessToken: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.viewerUserId !== user.id) {
    return NextResponse.json({ code: 404, message: "会话不存在", data: null }, { status: 404 });
  }

  if (session.status !== "ACTIVE") {
    return NextResponse.json({ code: 400, message: "会话已结束", data: null }, { status: 400 });
  }

  if (session.agentProfile.consentStatus !== "ACTIVE") {
    return NextResponse.json(
      { code: 4002, message: "该 Agent 已撤销授权，请更换角色", data: null },
      { status: 400 },
    );
  }

  const userMessage = maskSensitiveContent(content);
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      sender: "USER",
      content: userMessage,
      masked: true,
    },
  });

  const reply = await generateAgentReply({
    accessToken: session.agentProfile.owner.accessToken,
    roleKey: session.roleKey,
    scenarioKey: session.scenarioKey,
    message: content,
  });

  const saved = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      sender: "AGENT",
      content: reply.reply,
      masked: true,
    },
  });

  return NextResponse.json({
    code: 0,
    data: {
      messageId: saved.id,
      reply: saved.content,
      safetyFlags: [],
      fallback: reply.fallback,
    },
  });
}
