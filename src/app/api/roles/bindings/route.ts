import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getRoleLabel } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }

  const bindings = await prisma.roleBinding.findMany({
    include: {
      agentProfile: {
        select: {
          id: true,
          consentStatus: true,
        },
      },
    },
    orderBy: [{ roleKey: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({
    code: 0,
    data: bindings.map((item) => ({
      id: item.id,
      roleKey: item.roleKey,
      roleLabel: getRoleLabel(item.roleKey),
      agentProfileId: item.agentProfileId,
      enabled: item.enabled,
      weight: item.weight,
      consentStatus: item.agentProfile.consentStatus,
      updatedAt: item.updatedAt,
    })),
  });
}
