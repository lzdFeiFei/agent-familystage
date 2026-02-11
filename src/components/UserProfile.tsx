"use client";

import { useCallback, useEffect, useState } from "react";

type ApiResult = {
  code: number;
  message?: string;
  data?: Record<string, unknown> | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [infoRes, shadesRes] = await Promise.all([
        fetch("/api/user/info", { cache: "no-store" }),
        fetch("/api/user/shades", { cache: "no-store" }),
      ]);

      const infoJson = (await infoRes.json()) as ApiResult;
      const shadesJson = (await shadesRes.json()) as ApiResult;

      if (infoJson.code !== 0) {
        throw new Error(infoJson.message || "加载用户信息失败");
      }

      const infoData = (infoJson.data || {}) as Record<string, unknown>;
      const shadesData = (shadesJson.data || {}) as Record<string, unknown>;
      const shadeList = Array.isArray(shadesData.shades) ? shadesData.shades : [];

      setInfo(infoData);
      setShades(shadeList);
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
    window.location.reload();
  };

  if (loading) {
    return <p className="text-sm text-[#5c677d]">正在加载 SecondMe 资料...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#f3c5c5] bg-[#fff6f6] p-4 text-sm text-[#a23b3b]">
        {error}
      </div>
    );
  }

  if (!info) {
    return <p className="text-sm text-[#5c677d]">暂无资料</p>;
  }

  const nickname = getStringValue(info, ["nickname", "name"]) || "未命名用户";
  const avatar = getStringValue(info, ["avatar", "avatar_url"]);
  const secondmeUserId = getStringValue(info, ["user_id", "userId", "id"]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-[#d6deeb] bg-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="头像" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xl text-[#8a94ab]">
              {nickname.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-[#14213d]">{nickname}</p>
          <p className="text-xs text-[#5c677d]">SecondMe ID: {secondmeUserId || "-"}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#14213d]">兴趣标签（Shades）</p>
        {shades.length === 0 ? (
          <p className="text-sm text-[#5c677d]">暂无标签数据</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shades.map((item, index) => (
              <span
                key={`shade-${index}`}
                className="rounded-full border border-[#b9c8e6] bg-[#ecf3ff] px-3 py-1 text-xs text-[#1858b8]"
              >
                {typeof item === "string" ? item : JSON.stringify(item)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={load}
          className="cursor-pointer rounded-xl border border-[#d6deeb] bg-white px-4 py-2 text-sm text-[#14213d] transition-colors hover:bg-[#f7f9fc]"
        >
          刷新资料
        </button>
        <button
          type="button"
          onClick={logout}
          className="cursor-pointer rounded-xl border border-[#f1c2c2] bg-[#fff4f4] px-4 py-2 text-sm text-[#b84b4b] transition-colors hover:bg-[#ffeaea]"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
