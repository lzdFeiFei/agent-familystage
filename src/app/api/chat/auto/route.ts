import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { generateAutoDialogue } from "@/lib/roleplay";
import { ROLE_OPTIONS, SCENARIO_OPTIONS, getRoleLabel } from "@/lib/roles";

type AutoInput = {
  roleKeys?: string[];
  scenarioKey?: string;
  rounds?: number;
  topic?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const body = (await request.json()) as AutoInput;
  const roleKeys = Array.from(new Set(body.roleKeys || [])).filter(Boolean);
  if (roleKeys.length < 2) {
    return NextResponse.json(
      { code: 400, message: "至少选择两个角色", data: null },
      { status: 400 },
    );
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

  try {
    const transcript = await generateAutoDialogue({
      roleKeys,
      scenarioKey: body.scenarioKey,
      rounds: body.rounds || 8,
      topic: body.topic,
    });

    return NextResponse.json({
      code: 0,
      data: {
        scenarioKey: body.scenarioKey,
        scenarioLabel:
          SCENARIO_OPTIONS.find((item) => item.key === body.scenarioKey)?.label || "春节寒暄",
        selectedRoles: roleKeys.map((key) => ({ roleKey: key, roleLabel: getRoleLabel(key) })),
        transcript,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: 5001,
        message: error instanceof Error ? error.message : "自动对话失败",
        data: null,
      },
      { status: 500 },
    );
  }
}
