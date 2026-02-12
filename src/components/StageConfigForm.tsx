"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_OPTIONS, SCENARIO_OPTIONS, getRoleLabel } from "@/lib/roles";

type AgentItem = {
  agentProfileId: string;
  nickname: string;
  consentStatus: string;
};

type RoleMapping = {
  roleKey: string;
  agentProfileId: string;
};

type StageConfigFormProps = {
  agents: AgentItem[];
  initialMappings?: RoleMapping[];
};

export function StageConfigForm({ agents, initialMappings = [] }: StageConfigFormProps) {
  const router = useRouter();
  const [scenarioKey, setScenarioKey] = useState<string>(SCENARIO_OPTIONS[0].key);
  const [topic, setTopic] = useState("");
  const [rounds, setRounds] = useState(8);
  const [mappings, setMappings] = useState<RoleMapping[]>(
    initialMappings.length >= 2
      ? initialMappings
      : [
          { roleKey: ROLE_OPTIONS[0].key, agentProfileId: agents[0]?.agentProfileId || "" },
          {
            roleKey: ROLE_OPTIONS[1].key,
            agentProfileId: agents[1]?.agentProfileId || agents[0]?.agentProfileId || "",
          },
        ],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const roleOptions = useMemo(() => ROLE_OPTIONS.map((item) => item.key), []);

  const addMapping = () => {
    const nextRole = roleOptions.find((key) => !mappings.some((m) => m.roleKey === key)) || roleOptions[0];
    setMappings((prev) => [...prev, { roleKey: nextRole, agentProfileId: agents[0]?.agentProfileId || "" }]);
  };

  const updateMapping = (index: number, patch: Partial<RoleMapping>) => {
    setMappings((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeMapping = (index: number) => {
    setMappings((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const startConversation = async () => {
    setError("");
    if (mappings.length < 2) {
      setError("请至少配置 2 个角色。");
      return;
    }
    if (mappings.some((item) => !item.agentProfileId)) {
      setError("请为每个角色选择 Agent。");
      return;
    }

    const roleSet = new Set(mappings.map((item) => item.roleKey));
    if (roleSet.size !== mappings.length) {
      setError("角色不能重复。");
      return;
    }

    setSaving(true);
    try {
      const saveResults = await Promise.all(
        mappings.map((item) =>
          fetch("/api/roles/bind", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roleKey: item.roleKey,
              agentProfileId: item.agentProfileId,
              enabled: true,
              weight: 1,
            }),
          }).then((res) => res.json()),
        ),
      );

      const failed = saveResults.find((item) => item.code !== 0);
      if (failed) {
        setError(failed.message || "角色映射保存失败");
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "角色映射保存失败");
      return;
    } finally {
      setSaving(false);
    }

    const query = new URLSearchParams({
      scenarioKey,
      topic,
      rounds: String(rounds),
      roles: mappings.map((item) => item.roleKey).join(","),
    });
    router.push(`/stage/live?${query.toString()}`);
  };

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">新年家庭剧场配置</h2>
      </section>

      <section className="panel p-5">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Step 1 场景类型</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCENARIO_OPTIONS.map((scenario) => (
            <button
              key={scenario.key}
              type="button"
              onClick={() => setScenarioKey(scenario.key)}
              className={`rounded-full px-4 py-2 text-sm ${
                scenario.key === scenarioKey
                  ? "btn-primary border border-transparent"
                  : "btn-secondary border"
              }`}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Step 2 谈话主题</h3>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-3 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
          placeholder="默认主题下拉 + 自定义输入（可选）"
        />
      </section>

      <section className="panel p-5">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Step 3 参与角色与 Agent 映射</h3>
        <div className="mt-3 space-y-3">
          {mappings.map((mapping, index) => (
            <div key={`${mapping.roleKey}-${index}`} className="subpanel p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <select
                  value={mapping.roleKey}
                  onChange={(e) => updateMapping(index, { roleKey: e.target.value })}
                  className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {getRoleLabel(role.key)}
                    </option>
                  ))}
                </select>
                <select
                  value={mapping.agentProfileId}
                  onChange={(e) => updateMapping(index, { agentProfileId: e.target.value })}
                  className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
                >
                  <option value="">选择 Agent</option>
                  {agents.map((agent) => (
                    <option key={agent.agentProfileId} value={agent.agentProfileId}>
                      {agent.nickname} ({agent.consentStatus})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMapping(index)}
                  className="btn-secondary h-10 rounded-lg px-3 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addMapping} className="mt-3 text-sm text-[#2563EB]">
          + 添加角色
        </button>
      </section>

      <section className="panel p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="text-sm text-[var(--muted)]">自动对话轮数</label>
            <input
              type="number"
              min={2}
              max={20}
              value={rounds}
              onChange={(e) => setRounds(Math.max(2, Math.min(20, Number(e.target.value) || 8)))}
              className="h-11 w-40 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
            />
            {error ? <p className="text-sm text-[var(--error-text)]">{error}</p> : null}
          </div>
          <button
            type="button"
            onClick={startConversation}
            disabled={saving}
            className="btn-primary h-12 rounded-xl px-6 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "保存中..." : "开始对话"}
          </button>
        </div>
      </section>
    </div>
  );
}
