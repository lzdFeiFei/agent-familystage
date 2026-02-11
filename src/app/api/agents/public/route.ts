import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getRoleLabel } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

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

  const list = await prisma.agentProfile.findMany({
    where: {
      consentStatus: "ACTIVE",
      visibility: "PUBLIC",
    },
    include: {
      roleBindings: {
        where: { enabled: true },
        select: {
          id: true,
          roleKey: true,
          weight: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    code: 0,
    data: list.map((item) => ({
      agentProfileId: item.id,
      consentStatus: item.consentStatus,
      visibility: item.visibility,
      roleCount: item.roleBindings.length,
      roles: item.roleBindings.map((binding) => ({
        id: binding.id,
        roleKey: binding.roleKey,
        roleLabel: getRoleLabel(binding.roleKey),
        weight: binding.weight,
      })),
    })),
  });
}
