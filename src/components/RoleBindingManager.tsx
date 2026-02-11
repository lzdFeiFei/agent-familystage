"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_OPTIONS } from "@/lib/roles";

type AgentItem = {
  agentProfileId: string;
  roleCount: number;
};

type BindingItem = {
  id: string;
  roleKey: string;
  roleLabel: string;
  agentProfileId: string;
  enabled: boolean;
  weight: number;
  consentStatus: string;
};

export function RoleBindingManager() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [bindings, setBindings] = useState<BindingItem[]>([]);
  const [agentProfileId, setAgentProfileId] = useState("");
  const [roleKey, setRoleKey] = useState<string>(ROLE_OPTIONS[0].key);
  const [weight, setWeight] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [agentsRes, bindingsRes] = await Promise.all([
      fetch("/api/agents/public", { cache: "no-store" }),
      fetch("/api/roles/bindings", { cache: "no-store" }),
    ]);
    const agentsJson = await agentsRes.json();
    const bindingsJson = await bindingsRes.json();
    if (agentsJson.code !== 0) throw new Error(agentsJson.message || "加载 Agent 失败");
    if (bindingsJson.code !== 0) throw new Error(bindingsJson.message || "加载绑定失败");
    setAgents(agentsJson.data as AgentItem[]);
    setBindings(bindingsJson.data as BindingItem[]);
    if (!agentProfileId && agentsJson.data.length > 0) {
      setAgentProfileId((agentsJson.data[0] as AgentItem).agentProfileId);
    }
  }, [agentProfileId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [load]);

  async function bindRole() {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/roles/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleKey,
          agentProfileId,
          weight,
          enabled: true,
        }),
      });
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "绑定失败");
      }
      setMessage("角色绑定成功");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "绑定失败");
    }
  }

  async function revoke(agentId: string) {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/agents/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentProfileId: agentId }),
      });
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "撤销失败");
      }
      setMessage("已撤销该 Agent 并下线绑定");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "撤销失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#d6deeb] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#14213d]">创建/更新角色绑定</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            className="rounded-lg border border-[#d6deeb] bg-white px-3 py-2 text-sm"
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value)}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-[#d6deeb] bg-white px-3 py-2 text-sm"
            value={agentProfileId}
            onChange={(e) => setAgentProfileId(e.target.value)}
          >
            <option value="">选择 Agent</option>
            {agents.map((agent, index) => (
              <option key={agent.agentProfileId} value={agent.agentProfileId}>
                Agent #{index + 1} (已绑 {agent.roleCount})
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value) || 1)}
            className="rounded-lg border border-[#d6deeb] bg-white px-3 py-2 text-sm"
            placeholder="权重"
          />
        </div>
        <button
          type="button"
          onClick={bindRole}
          className="mt-3 rounded-lg bg-[#1f6feb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558bf]"
        >
          保存绑定
        </button>
      </div>

      <div className="rounded-xl border border-[#d6deeb] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#14213d]">当前绑定列表</h3>
        <div className="mt-3 space-y-2">
          {bindings.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e2e9f6] p-3"
            >
              <p className="text-sm text-[#14213d]">
                {item.roleLabel} · Agent({item.agentProfileId.slice(0, 8)}) · 权重 {item.weight} ·{" "}
                {item.enabled ? "启用" : "停用"}
              </p>
              <button
                type="button"
                onClick={() => revoke(item.agentProfileId)}
                className="rounded-md border border-[#f1c2c2] bg-[#fff4f4] px-3 py-1 text-xs text-[#b84b4b] hover:bg-[#ffeaea]"
              >
                撤销该 Agent
              </button>
            </div>
          ))}
          {bindings.length === 0 ? <p className="text-sm text-[#5c677d]">暂无绑定</p> : null}
        </div>
      </div>

      {message ? <p className="text-sm text-[#1f6f3f]">{message}</p> : null}
      {error ? <p className="text-sm text-[#b84b4b]">{error}</p> : null}
    </div>
  );
}
