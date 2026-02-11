import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getRoleLabel, ROLE_OPTIONS } from "@/lib/roles";

type BindInput = {
  roleKey?: string;
  agentProfileId?: string;
  enabled?: boolean;
  weight?: number;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }
  if (!isAdminUser(user.id)) {
    return NextResponse.json({ code: 403, message: "无权限", data: null }, { status: 403 });
  }

  const body = (await request.json()) as BindInput;
  if (!body.roleKey || !body.agentProfileId) {
    return NextResponse.json(
      { code: 400, message: "roleKey 和 agentProfileId 必填", data: null },
      { status: 400 },
    );
  }

  const roleExists = ROLE_OPTIONS.some((item) => item.key === body.roleKey);
  if (!roleExists) {
    return NextResponse.json({ code: 400, message: "无效角色", data: null }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { id: body.agentProfileId },
  });
  if (!profile || profile.consentStatus !== "ACTIVE") {
    return NextResponse.json(
      { code: 404, message: "Agent 不可用或已撤销", data: null },
      { status: 404 },
    );
  }

  const binding = await prisma.roleBinding.upsert({
    where: {
      roleKey_agentProfileId: {
        roleKey: body.roleKey,
        agentProfileId: body.agentProfileId,
      },
    },
    create: {
      roleKey: body.roleKey,
      agentProfileId: body.agentProfileId,
      enabled: body.enabled ?? true,
      weight: Math.max(1, body.weight ?? 1),
      createdByUserId: user.id,
    },
    update: {
      enabled: body.enabled ?? true,
      weight: Math.max(1, body.weight ?? 1),
    },
  });

  return NextResponse.json({
    code: 0,
    data: {
      id: binding.id,
      roleKey: binding.roleKey,
      roleLabel: getRoleLabel(binding.roleKey),
      agentProfileId: binding.agentProfileId,
      enabled: binding.enabled,
      weight: binding.weight,
      updatedAt: binding.updatedAt,
    },
  });
}
