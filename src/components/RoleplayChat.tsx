"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ROLE_OPTIONS, SCENARIO_OPTIONS, getRoleLabel } from "@/lib/roles";

type AutoMessage = {
  turn: number;
  roleKey: string;
  roleLabel: string;
  content: string;
  fallback: boolean;
  isSelf: boolean;
};

type HistoryResponse = {
  code: number;
  message?: string;
  data?: {
    sessionId: string;
    messages: Array<{
      id: string;
      sender: string;
      content: string;
      createdAt: string;
    }>;
  };
};

type RoleplayChatProps = {
  initialScenarioKey?: string;
  initialRounds?: number;
  initialTopic?: string;
  initialRoles?: string[];
  initialSessionId?: string;
};

function extractRole(content: string) {
  const matched = content.match(/^【(.+?)】(.*)$/);
  if (!matched) {
    return { roleLabel: "亲戚", content };
  }
  return {
    roleLabel: matched[1],
    content: matched[2] || "",
  };
}

export function RoleplayChat({
  initialScenarioKey,
  initialRounds,
  initialTopic,
  initialRoles,
  initialSessionId,
}: RoleplayChatProps = {}) {
  const [scenarioKey, setScenarioKey] = useState<string>(
    initialScenarioKey || SCENARIO_OPTIONS[0].key,
  );
  const [rounds, setRounds] = useState(initialRounds || 8);
  const [topic, setTopic] = useState(initialTopic || "");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    initialRoles && initialRoles.length >= 2
      ? initialRoles
      : [ROLE_OPTIONS[0].key, ROLE_OPTIONS[1].key, ROLE_OPTIONS[2].key],
  );
  const [messages, setMessages] = useState<AutoMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [connectionState, setConnectionState] = useState<
    "idle" | "streaming" | "stopped" | "done"
  >("idle");
  const abortRef = useRef<AbortController | null>(null);

  const title = useMemo(() => {
    const scenarioLabel =
      SCENARIO_OPTIONS.find((item) => item.key === scenarioKey)?.label || "春节寒暄";
    return `${scenarioLabel} · ${selectedRoles.map(getRoleLabel).join(" / ")}`;
  }, [scenarioKey, selectedRoles]);

  useEffect(() => {
    if (!initialSessionId) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const response = await fetch(`/api/chat/sessions/${initialSessionId}/messages`, {
          cache: "no-store",
        });
        const result = (await response.json()) as HistoryResponse;
        if (!response.ok || result.code !== 0 || !result.data) {
          return;
        }
        if (cancelled) return;
        const parsed = result.data.messages
          .filter((item) => item.sender === "AGENT")
          .map((item, index) => {
            const value = extractRole(item.content);
            return {
              turn: index + 1,
              roleKey: value.roleLabel === "我" ? "self" : `history-${index + 1}`,
              roleLabel: value.roleLabel,
              content: value.content,
              fallback: false,
              isSelf: value.roleLabel === "我",
            };
          });
        setMessages(parsed);
        setConnectionState(parsed.length > 0 ? "done" : "idle");
      } catch {
        // ignore history load error
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [initialSessionId]);

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
    setConnectionState("streaming");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/stage/live/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleKeys: selectedRoles,
          scenarioKey,
          rounds,
          topic,
          sessionId: sessionId || undefined,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "流式对话失败");
      }
      if (!response.body) {
        throw new Error("浏览器不支持流式响应");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const upsertMessage = (incoming: {
        turn: number;
        roleKey: string;
        roleLabel: string;
        delta: string;
        fallback: boolean;
      }) => {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (item) => item.turn === incoming.turn && item.roleKey === incoming.roleKey,
          );
          if (idx === -1) {
            return [
              ...prev,
              {
                turn: incoming.turn,
                roleKey: incoming.roleKey,
                roleLabel: incoming.roleLabel,
                content: incoming.delta,
                fallback: incoming.fallback,
                isSelf: incoming.roleKey === "self" || incoming.roleLabel === "我",
              },
            ];
          }
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            content: `${next[idx].content}${incoming.delta}`,
            fallback: incoming.fallback,
            isSelf: incoming.roleKey === "self" || incoming.roleLabel === "我",
          };
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          separatorIndex = buffer.indexOf("\n\n");

          const lines = rawEvent.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event:"));
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const payloadRaw = dataLine.replace("data:", "").trim();
          if (!payloadRaw) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(payloadRaw) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (eventType === "meta") {
            const sid = String(payload.sessionId || "");
            if (sid) {
              setSessionId(sid);
              const url = new URL(window.location.href);
              url.searchParams.set("sessionId", sid);
              window.history.replaceState(null, "", url.toString());
            }
          }
          if (eventType === "chunk") {
            upsertMessage({
              turn: Number(payload.turn || 0),
              roleKey: String(payload.roleKey || ""),
              roleLabel: String(payload.roleLabel || "亲戚"),
              delta: String(payload.delta || ""),
              fallback: Boolean(payload.fallback),
            });
          }
          if (eventType === "error") {
            throw new Error(String(payload.message || "流式对话失败"));
          }
          if (eventType === "end") {
            setConnectionState("done");
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setConnectionState("stopped");
      } else {
        setError(e instanceof Error ? e.message : "自动对话失败");
        setConnectionState("stopped");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setConnectionState("stopped");
  }

  return (
    <div className="space-y-4">
      <section className="panel px-4 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <select
            value={scenarioKey}
            onChange={(e) => setScenarioKey(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          >
            {SCENARIO_OPTIONS.map((scenario) => (
              <option key={scenario.key} value={scenario.key}>
                场景：{scenario.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={2}
            max={20}
            value={rounds}
            onChange={(e) => setRounds(Math.max(2, Math.min(20, Number(e.target.value) || 8)))}
            className="w-30 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
            placeholder="轮数"
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-w-64 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
            placeholder="主题（可选）"
          />
          <button
            type="button"
            onClick={runAutoChat}
            disabled={loading}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "生成中..." : "开始自动对话"}
          </button>
        </div>
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
                    ? "border-transparent bg-[var(--success-bg)] text-[var(--success-text)]"
                    : "border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="subpanel px-4 py-3 text-sm text-[var(--muted)]">
                点击“开始自动对话”，系统会让“我”和多个亲戚 Agent 自动轮流发言。
              </p>
            ) : null}

            {messages.map((msg) => (
              <div
                key={`${msg.turn}-${msg.roleKey}`}
                className={`flex ${msg.isSelf ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`w-full max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                    msg.fallback
                      ? "alert-warning"
                      : msg.isSelf
                      ? "border border-transparent bg-[var(--primary)] text-white"
                      : "subpanel"
                  }`}
                >
                  <p className={`text-xs ${msg.isSelf && !msg.fallback ? "text-white/80" : "text-[var(--muted)]"}`}>
                    第 {msg.turn} 轮 · {msg.roleLabel}
                    {msg.fallback ? "（降级回复）" : ""}
                  </p>
                  <p className={`mt-1 ${msg.isSelf && !msg.fallback ? "text-white" : "text-[var(--foreground)]"}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {loading ? (
              <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full w-1/3 bg-[var(--primary)]" />
              </div>
            ) : null}
            <p className="text-xs text-[var(--muted)]">
              连接状态：
              {connectionState === "streaming"
                ? "流式中"
                : connectionState === "done"
                ? "已完成"
                : connectionState === "stopped"
                ? "已停止"
                : "空闲"}
            </p>
          </div>

          <aside className="subpanel p-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">会话控制</h3>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={runAutoChat}
                className="btn-secondary inline-flex h-10 w-full items-center justify-center rounded-lg text-sm"
              >
                重连
              </button>
              <button
                type="button"
                onClick={stopStreaming}
                className="btn-danger inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold"
              >
                停止会话
              </button>
              <Link
                href="/"
                className="btn-secondary inline-flex h-10 w-full items-center justify-center rounded-lg text-sm"
              >
                返回主页
              </Link>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">当前配置：{title}</p>
            {sessionId ? (
              <p className="mt-2 text-xs text-[var(--muted)]">会话ID：{sessionId}</p>
            ) : null}
          </aside>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--error-text)]">{error}</p> : null}
      </section>
    </div>
  );
}
