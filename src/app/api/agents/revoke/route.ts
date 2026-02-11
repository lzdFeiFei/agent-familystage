import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RevokeInput = {
  agentProfileId?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录", data: null }, { status: 401 });
  }
  if (!isAdminUser(user.id)) {
    return NextResponse.json({ code: 403, message: "无权限", data: null }, { status: 403 });
  }

  const body = (await request.json()) as RevokeInput;
  if (!body.agentProfileId) {
    return NextResponse.json(
      { code: 400, message: "agentProfileId 必填", data: null },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.agentProfile.update({
      where: { id: body.agentProfileId },
      data: {
        consentStatus: "REVOKED",
        revokedAt: new Date(),
      },
    }),
    prisma.roleBinding.updateMany({
      where: { agentProfileId: body.agentProfileId },
      data: { enabled: false },
    }),
  ]);

  return NextResponse.json({ code: 0, data: { ok: true } });
}
