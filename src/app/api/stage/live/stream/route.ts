import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { generateAgentReply, pickBindingsByRoles } from "@/lib/roleplay";
import { prisma } from "@/lib/prisma";
import { ROLE_OPTIONS, SCENARIO_OPTIONS, getRoleLabel } from "@/lib/roles";

type StreamInput = {
  roleKeys?: string[];
  scenarioKey?: string;
  rounds?: number;
  topic?: string;
  sessionId?: string;
};

const ROLE_DRIFT_PATTERNS = [
  /我现在主要/,
  /我更想/,
  /我还在学习阶段/,
  /提升技术/,
  /探索副业/,
  /前端这行/,
  /攒够首付/,
];

function toSse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function chunkText(text: string, size = 12) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length ? chunks : [text];
}

function stripStageDirections(text: string) {
  return text.replace(/[*＊][^*＊\n]{0,100}[*＊]/g, "").trim();
}

function normalizeReply(text: string) {
  return stripStageDirections(text).replace(/\s+/g, " ").trim();
}

function isRoleDrift(reply: string, roleKey: string) {
  if (roleKey === "self") return false;
  return ROLE_DRIFT_PATTERNS.some((pattern) => pattern.test(reply));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const body = (await request.json()) as StreamInput;
  const roleKeys = Array.from(new Set(body.roleKeys || [])).filter(Boolean);
  if (roleKeys.length < 1) {
    return NextResponse.json({ code: 400, message: "至少选择一个亲戚角色", data: null }, { status: 400 });
  }

  const validRoleKeys = new Set(ROLE_OPTIONS.map((item) => item.key));
  if (roleKeys.some((key) => !validRoleKeys.has(key as (typeof ROLE_OPTIONS)[number]["key"]))) {
    return NextResponse.json({ code: 400, message: "包含无效角色", data: null }, { status: 400 });
  }

  if (!body.scenarioKey) {
    return NextResponse.json({ code: 400, message: "scenarioKey 必填", data: null }, { status: 400 });
  }

  const validScenarios = new Set(SCENARIO_OPTIONS.map((item) => item.key));
  if (!validScenarios.has(body.scenarioKey as (typeof SCENARIO_OPTIONS)[number]["key"])) {
    return NextResponse.json({ code: 400, message: "无效场景", data: null }, { status: 400 });
  }

  const selected = await pickBindingsByRoles(roleKeys);
  const totalRounds = Math.max(1, Math.min(Number(body.rounds) || 8, 20));
  const scenarioKey = body.scenarioKey;
  const scenarioLabel =
    SCENARIO_OPTIONS.find((item) => item.key === scenarioKey)?.label || "春节寒暄";
  const selfRoleLabel = "我";

  let sessionId = body.sessionId || "";
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, viewerUserId: true },
    });
    if (!existing || existing.viewerUserId !== user.id) {
      return NextResponse.json({ code: 404, message: "会话不存在", data: null }, { status: 404 });
    }
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: "ACTIVE" },
    });
  } else {
    const created = await prisma.chatSession.create({
      data: {
        viewerUserId: user.id,
        roleKey: roleKeys[0] || "multi",
        scenarioKey,
        agentProfileId: selected[0].binding.agentProfileId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    sessionId = created.id;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(toSse(event, payload)));
      };

      try {
        send("meta", {
          sessionId,
          scenarioKey,
          scenarioLabel,
          rounds: totalRounds,
          roles: [
            { roleKey: "self", roleLabel: selfRoleLabel },
            ...roleKeys.map((key) => ({ roleKey: key, roleLabel: getRoleLabel(key) })),
          ],
        });

        let previous = body.topic?.trim()
          ? `大家围坐吃饭，话题是：${body.topic.trim()}。谁先开口？`
          : `大家围坐吃饭，话题是：${scenarioLabel}。谁先开口？`;

        const actors = [
          {
            roleKey: "self",
            roleLabel: selfRoleLabel,
            accessToken: user.accessToken,
          },
          ...selected.map((item) => ({
            roleKey: item.roleKey,
            roleLabel: getRoleLabel(item.roleKey),
            accessToken: item.binding.agentProfile.owner.accessToken,
          })),
        ];

        for (let turn = 1; turn <= totalRounds; turn++) {
          const actor = actors[(turn - 1) % actors.length];
          const roleLabel = actor.roleLabel;
          const promptBase = `上一句是：${previous}\n请你继续接话，控制在80字以内。`;
          const firstReply = await generateAgentReply({
            accessToken: actor.accessToken,
            roleKey: actor.roleKey,
            scenarioKey,
            message: promptBase,
          });
          let content = normalizeReply(firstReply.reply);
          let fallback = firstReply.fallback;

          if (isRoleDrift(content, actor.roleKey)) {
            const retryReply = await generateAgentReply({
              accessToken: actor.accessToken,
              roleKey: actor.roleKey,
              scenarioKey,
              message: `${promptBase}\n你刚才串角色了。只能扮演${roleLabel}这个长辈，不能用年轻人“我”的职业口吻。重写一句。`,
            });
            content = normalizeReply(retryReply.reply);
            fallback = fallback || retryReply.fallback;
          }

          if (isRoleDrift(content, actor.roleKey)) {
            content = `这事儿先别急，咱们边吃边聊，慢慢说。`;
            fallback = true;
          }

          const pieces = chunkText(content, 10);
          const fullContent = `【${roleLabel}】${content}`;

          await prisma.chatMessage.create({
            data: {
              sessionId,
              sender: "AGENT",
              content: fullContent,
              masked: true,
            },
          });

          for (let i = 0; i < pieces.length; i++) {
            send("chunk", {
              turn,
              roleKey: actor.roleKey,
              roleLabel,
              delta: pieces[i],
              fallback,
              done: i === pieces.length - 1,
            });
            await new Promise((r) => setTimeout(r, 80));
          }

          previous = `${roleLabel}：${content}`;
        }

        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { status: "CLOSED" },
        });
        send("end", { done: true });
      } catch (error) {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { status: "CLOSED" },
        });
        send("error", {
          message: error instanceof Error ? error.message : "流式会话异常中断",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
