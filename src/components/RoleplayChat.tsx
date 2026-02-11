"use client";

import { useMemo, useState } from "react";
import { ROLE_OPTIONS, SCENARIO_OPTIONS, getRoleLabel } from "@/lib/roles";

type AutoMessage = {
  turn: number;
  roleKey: string;
  roleLabel: string;
  content: string;
  fallback: boolean;
};

export function RoleplayChat() {
  const [scenarioKey, setScenarioKey] = useState<string>(SCENARIO_OPTIONS[0].key);
  const [rounds, setRounds] = useState(8);
  const [topic, setTopic] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    ROLE_OPTIONS[0].key,
    ROLE_OPTIONS[1].key,
    ROLE_OPTIONS[2].key,
  ]);
  const [messages, setMessages] = useState<AutoMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => {
    const scenarioLabel =
      SCENARIO_OPTIONS.find((item) => item.key === scenarioKey)?.label || "春节寒暄";
    return `${scenarioLabel} · ${selectedRoles.map(getRoleLabel).join(" / ")}`;
  }, [scenarioKey, selectedRoles]);

  function toggleRole(roleKey: string) {
    setSelectedRoles((prev) => {
      if (prev.includes(roleKey)) {
        if (prev.length <= 2) return prev;
        return prev.filter((item) => item !== roleKey);
      }
      return [...prev, roleKey];
    });
  }

  async function runAutoChat() {
    setLoading(true);
    setError("");
    setMessages([]);
    try {
      const response = await fetch("/api/chat/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleKeys: selectedRoles,
          scenarioKey,
          rounds,
          topic,
        }),
      });
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "自动对话失败");
      }
      setMessages(result.data.transcript as AutoMessage[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "自动对话失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#d6deeb] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#14213d]">自动群聊设置</h3>
        <p className="mt-1 text-xs text-[#5c677d]">选择多个角色后，一键自动生成整段对话。</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            value={scenarioKey}
            onChange={(e) => setScenarioKey(e.target.value)}
            className="rounded-lg border border-[#d6deeb] bg-white px-3 py-2 text-sm"
          >
            {SCENARIO_OPTIONS.map((scenario) => (
              <option key={scenario.key} value={scenario.key}>
                {scenario.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={2}
            max={20}
            value={rounds}
            onChange={(e) => setRounds(Math.max(2, Math.min(20, Number(e.target.value) || 8)))}
            className="rounded-lg border border-[#d6deeb] bg-white px-3 py-2 text-sm"
            placeholder="对话轮数"
          />

          <button
            type="button"
            onClick={runAutoChat}
            disabled={loading}
            className="rounded-lg bg-[#1f6feb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558bf] disabled:bg-[#9dbdf3]"
          >
            {loading ? "生成中..." : "开始自动对话"}
          </button>
        </div>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-3 w-full rounded-lg border border-[#d6deeb] bg-white px-3 py-2 text-sm"
          placeholder="可选：输入本轮自定义话题（如：催婚+买房双重压力）"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((role) => {
            const selected = selectedRoles.includes(role.key);
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => toggleRole(role.key)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selected
                    ? "border-[#4f7fd0] bg-[#ebf2ff] text-[#31589d]"
                    : "border-[#d6deeb] bg-white text-[#5c677d]"
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-[#5c677d]">当前配置：{title}</p>
      </div>

      <div className="rounded-xl border border-[#d6deeb] bg-white p-4">
        <div className="h-[28rem] space-y-2 overflow-auto rounded-lg border border-[#e2e9f6] bg-[#fafcff] p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-[#5c677d]">点击“开始自动对话”，系统会让多个 Agent 自动轮流发言。</p>
          ) : null}

          {messages.map((msg) => (
            <div key={`${msg.turn}-${msg.roleKey}`} className="rounded-lg border border-[#e2e9f6] bg-white p-3">
              <p className="text-xs text-[#5c677d]">
                第 {msg.turn} 轮 · {msg.roleLabel}
                {msg.fallback ? "（降级回复）" : ""}
              </p>
              <p className="mt-1 text-sm text-[#14213d]">{msg.content}</p>
            </div>
          ))}
        </div>
        {error ? <p className="mt-2 text-sm text-[#b84b4b]">{error}</p> : null}
      </div>
    </div>
  );
}
