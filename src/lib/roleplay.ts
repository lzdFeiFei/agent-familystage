import { AgentProfile, RoleBinding } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoleLabel, SCENARIO_OPTIONS } from "@/lib/roles";
import { maskSensitiveContent } from "@/lib/safety";
import { sendRoleplayChat } from "@/lib/secondme";

type BindingWithAgent = RoleBinding & {
  agentProfile: AgentProfile & {
    owner: {
      accessToken: string;
      tokenExpiresAt: Date;
    };
  };
};

export async function pickBindingByRole(roleKey: string) {
  const candidates = await prisma.roleBinding.findMany({
    where: {
      roleKey,
      enabled: true,
      agentProfile: {
        consentStatus: "ACTIVE",
      },
    },
    include: {
      agentProfile: {
        include: {
          owner: {
            select: {
              accessToken: true,
              tokenExpiresAt: true,
            },
          },
        },
      },
    },
  });

  if (!candidates.length) return null;
  return pickByWeight(candidates as BindingWithAgent[]);
}

export async function pickBindingsByRoles(roleKeys: string[]) {
  const pairs: Array<{ roleKey: string; binding: BindingWithAgent }> = [];
  for (const roleKey of roleKeys) {
    const picked = await pickBindingByRole(roleKey);
    if (!picked) {
      throw new Error(`角色 ${getRoleLabel(roleKey)} 暂无可用 Agent`);
    }
    pairs.push({ roleKey, binding: picked as BindingWithAgent });
  }
  return pairs;
}

function pickByWeight<T extends { weight: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + Math.max(item.weight, 1), 0);
  let hit = Math.random() * total;
  for (const item of items) {
    hit -= Math.max(item.weight, 1);
    if (hit <= 0) return item;
  }
  return items[0];
}

export async function generateAgentReply(params: {
  accessToken: string;
  roleKey: string;
  scenarioKey: string;
  message: string;
}) {
  const roleLabel = getRoleLabel(params.roleKey);
  const scenarioLabel =
    SCENARIO_OPTIONS.find((item) => item.key === params.scenarioKey)?.label || "春节寒暄";

  try {
    const result = await sendRoleplayChat(params.accessToken, {
      roleLabel,
      scenarioLabel,
      message: params.message,
    });
    return {
      reply: maskSensitiveContent(result.reply),
      fallback: false,
    };
  } catch (error) {
    console.warn("Roleplay chat fallback:", error);
    const safe = maskSensitiveContent(params.message);
    return {
      reply: `【${roleLabel}】哎呀，这事我先记下了。你刚才说“${safe.slice(0, 24)}...”，回家再慢慢唠。`,
      fallback: true,
    };
  }
}

export async function generateAutoDialogue(params: {
  roleKeys: string[];
  scenarioKey: string;
  rounds: number;
  topic?: string;
}) {
  const selected = await pickBindingsByRoles(params.roleKeys);
  const scenarioLabel =
    SCENARIO_OPTIONS.find((item) => item.key === params.scenarioKey)?.label || "春节寒暄";
  const totalRounds = Math.max(1, Math.min(params.rounds, 20));
  const transcript: Array<{
    turn: number;
    roleKey: string;
    roleLabel: string;
    content: string;
    fallback: boolean;
  }> = [];

  let previous = params.topic?.trim()
    ? `大家围坐吃饭，话题是：${params.topic?.trim()}。谁先开口？`
    : `大家围坐吃饭，话题是：${scenarioLabel}。谁先开口？`;

  for (let turn = 1; turn <= totalRounds; turn++) {
    const actor = selected[(turn - 1) % selected.length];
    const roleLabel = getRoleLabel(actor.roleKey);
    const result = await generateAgentReply({
      accessToken: actor.binding.agentProfile.owner.accessToken,
      roleKey: actor.roleKey,
      scenarioKey: params.scenarioKey,
      message: `上一句是：${previous}\n请你继续接话，控制在80字以内。`,
    });

    transcript.push({
      turn,
      roleKey: actor.roleKey,
      roleLabel,
      content: result.reply,
      fallback: result.fallback,
    });
    previous = `${roleLabel}：${result.reply}`;
  }

  return transcript;
}
