"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ApiResult = {
  code: number;
  message?: string;
  data?: Record<string, unknown> | null;
};

type RecentSessionResult = {
  code: number;
  message?: string;
  data?: {
    sessionId: string;
    roleKey: string;
    scenarioKey: string;
    status: string;
    updatedAt: string;
    lastMessage: string;
  } | null;
};

function getStringValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function UserProfile() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [shades, setShades] = useState<unknown[]>([]);
  const [recentSession, setRecentSession] = useState<RecentSessionResult["data"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [infoRes, shadesRes, recentRes] = await Promise.all([
        fetch("/api/user/info", { cache: "no-store" }),
        fetch("/api/user/shades", { cache: "no-store" }),
        fetch("/api/chat/sessions/recent", { cache: "no-store" }),
      ]);

      const infoJson = (await infoRes.json()) as ApiResult;
      const shadesJson = (await shadesRes.json()) as ApiResult;
      const recentJson = (await recentRes.json()) as RecentSessionResult;

      if (infoJson.code !== 0) {
        throw new Error(infoJson.message || "加载用户信息失败");
      }

      const infoData = (infoJson.data || {}) as Record<string, unknown>;
      const shadesData = (shadesJson.data || {}) as Record<string, unknown>;
      const shadeList = Array.isArray(shadesData.shades) ? shadesData.shades : [];

      setInfo(infoData);
      setShades(shadeList);
      setRecentSession(recentJson.code === 0 ? recentJson.data || null : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">正在加载我的信息...</p>;
  }

  if (error) {
    return (
      <div className="alert-error rounded-xl p-4 text-sm">
        {error}
      </div>
    );
  }

  if (!info) {
    return <p className="text-sm text-[var(--muted)]">暂无资料</p>;
  }

  const nickname = getStringValue(info, ["nickname", "name"]) || "未命名用户";
  const avatar = getStringValue(info, ["avatar", "avatar_url"]);
  const secondmeUserId = getStringValue(info, ["user_id", "userId", "id"]);

  return (
    <div className="space-y-5">
      <div className="subpanel p-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--line)] bg-white">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl text-[var(--muted)]">
                {nickname.slice(0, 1)}
              </div>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">{nickname}</p>
            <p className="text-xs text-[var(--muted)]">@{secondmeUserId || "-"}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">兴趣标签（Shades）</p>
        {shades.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无标签数据</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shades.map((item, index) => (
              <span
                key={`shade-${index}`}
                className="rounded-full border border-[var(--line)] bg-[#f8fafc] px-3 py-1 text-xs text-[#334155]"
              >
                {typeof item === "string" ? item : JSON.stringify(item)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Link
          href="/stage/config"
          className="btn-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold"
        >
          进入新年场景配置
        </Link>
        {recentSession ? (
          <Link
            href={`/stage/live?sessionId=${encodeURIComponent(recentSession.sessionId)}`}
            className="btn-secondary inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm"
          >
            继续上次会话
          </Link>
        ) : null}
        <button
          type="button"
          onClick={load}
          className="btn-secondary inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm"
        >
          刷新资料
        </button>
        <button
          type="button"
          onClick={logout}
          className="btn-danger inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold"
        >
          退出登录
        </button>
      </div>

      {recentSession ? (
        <div className="subpanel p-3">
          <p className="text-xs font-semibold text-[var(--foreground)]">最近会话</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            sessionId：{recentSession.sessionId.slice(0, 8)}...
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            最近消息：{recentSession.lastMessage || "暂无"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
