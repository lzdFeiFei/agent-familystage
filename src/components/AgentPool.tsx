"use client";

import { useEffect, useState } from "react";

type AgentItem = {
  agentProfileId: string;
  consentStatus: string;
  visibility: string;
  roleCount: number;
  roles: Array<{
    id: string;
    roleKey: string;
    roleLabel: string;
    weight: number;
  }>;
};

export function AgentPool() {
  const [items, setItems] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agents/public", { cache: "no-store" });
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "加载失败");
      }
      setItems(result.data as AgentItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-sm text-[#5c677d]">正在加载角色池...</p>;
  if (error) return <p className="text-sm text-[#b84b4b]">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5c677d]">当前可用 Agent：{items.length}</p>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 text-xs text-[#14213d] hover:bg-[#f2f6ff]"
        >
          刷新
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[#5c677d]">暂无公开 Agent，请先让朋友登录授权。</p>
        ) : null}
        {items.map((item, index) => (
          <div key={item.agentProfileId} className="rounded-xl border border-[#d6deeb] bg-white p-4">
            <p className="text-sm font-medium text-[#14213d]">
              Agent #{index + 1} · 已绑定角色 {item.roleCount} 个
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.roles.map((role) => (
                <span
                  key={role.id}
                  className="rounded-full border border-[#c6d6f3] bg-[#f0f5ff] px-2 py-0.5 text-xs text-[#365e9b]"
                >
                  {role.roleLabel} (权重 {role.weight})
                </span>
              ))}
              {item.roles.length === 0 ? (
                <span className="text-xs text-[#5c677d]">未绑定任何角色</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
