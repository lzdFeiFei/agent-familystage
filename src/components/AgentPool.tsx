"use client";

import { useEffect, useState } from "react";

type AgentItem = {
  agentProfileId: string;
  nickname: string;
  avatarUrl?: string | null;
  secondmeUserId: string;
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

  if (loading) return <p className="text-sm text-[var(--muted)]">正在加载角色池...</p>;
  if (error) return <p className="text-sm text-[var(--error-text)]">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">当前可用 Agent：{items.length}</p>
        <button
          type="button"
          onClick={load}
          className="btn-secondary rounded-lg px-3 py-1 text-xs"
        >
          刷新
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无公开 Agent，请先让朋友登录授权。</p>
        ) : null}
        {items.map((item, index) => (
          <div key={item.agentProfileId} className="panel p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[var(--line)] bg-[#f8fafc] text-sm text-[var(--muted)]">
                {item.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatarUrl} alt={item.nickname} className="h-full w-full object-cover" />
                ) : (
                  item.nickname.slice(0, 1)
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{item.nickname}</p>
                <p className="text-xs text-[var(--muted)]">@{item.secondmeUserId}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Agent #{index + 1} · 已绑定角色 {item.roleCount} 个
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.roles.map((role) => (
                <span
                  key={role.id}
                  className="rounded-full border border-[var(--line)] bg-[#f8fafc] px-2 py-1 text-xs text-[#334155]"
                >
                  {role.roleLabel} (权重 {role.weight})
                </span>
              ))}
              {item.roles.length === 0 ? (
                <span className="text-xs text-[var(--muted)]">未绑定任何角色</span>
              ) : null}
            </div>
            <div className="mt-3">
              <span className="status-success rounded-full px-2 py-1 text-[11px] font-semibold">
                {item.consentStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
