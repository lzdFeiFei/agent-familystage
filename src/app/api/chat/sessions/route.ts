import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { pickBindingByRole } from "@/lib/roleplay";
import { ROLE_OPTIONS, SCENARIO_OPTIONS, getRoleLabel } from "@/lib/roles";

type SessionInput = {
  roleKey?: string;
  scenarioKey?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const body = (await request.json()) as SessionInput;
  if (!body.roleKey || !body.scenarioKey) {
    return NextResponse.json(
      { code: 400, message: "roleKey 与 scenarioKey 必填", data: null },
      { status: 400 },
    );
  }

  if (!ROLE_OPTIONS.some((item) => item.key === body.roleKey)) {
    return NextResponse.json({ code: 400, message: "无效角色", data: null }, { status: 400 });
  }
  if (!SCENARIO_OPTIONS.some((item) => item.key === body.scenarioKey)) {
    return NextResponse.json({ code: 400, message: "无效场景", data: null }, { status: 400 });
  }

  const picked = await pickBindingByRole(body.roleKey);
  if (!picked) {
    return NextResponse.json(
      { code: 404, message: "该角色暂无可用 Agent", data: null },
      { status: 404 },
    );
  }

  const session = await prisma.chatSession.create({
    data: {
      viewerUserId: user.id,
      roleKey: body.roleKey,
      agentProfileId: picked.agentProfileId,
      scenarioKey: body.scenarioKey,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({
    code: 0,
    data: {
      sessionId: session.id,
      roleKey: session.roleKey,
      roleLabel: getRoleLabel(session.roleKey),
      scenarioKey: session.scenarioKey,
      agentProfileId: session.agentProfileId,
    },
  });
}
