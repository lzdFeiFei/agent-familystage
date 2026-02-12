import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { StageConfigForm } from "@/components/StageConfigForm";

export default async function StageConfigPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profiles = await prisma.agentProfile.findMany({
    where: {
      consentStatus: "ACTIVE",
      visibility: "PUBLIC",
    },
    include: {
      owner: {
        select: {
          nickname: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const bindings = await prisma.roleBinding.findMany({
    where: {
      enabled: true,
      agentProfile: {
        consentStatus: "ACTIVE",
      },
    },
    select: {
      roleKey: true,
      agentProfileId: true,
    },
    orderBy: [{ roleKey: "asc" }, { updatedAt: "desc" }],
  });

  const uniqueRoleMappings = Array.from(
    new Map(bindings.map((item) => [item.roleKey, item])).values(),
  );

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8">
      <main className="mx-auto w-full max-w-[1240px]">
        <StageConfigForm
          agents={profiles.map((item) => ({
            agentProfileId: item.id,
            nickname: item.owner.nickname || "未命名亲友",
            consentStatus: item.consentStatus,
          }))}
          initialMappings={uniqueRoleMappings}
        />
      </main>
    </div>
  );
}
