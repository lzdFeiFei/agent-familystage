import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { UserProfile } from "@/components/UserProfile";
import { AgentPool } from "@/components/AgentPool";

export default async function Home() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8">
      <main className="mx-auto w-full max-w-[1240px] space-y-5">
        <header className="panel flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Agent FamilyStage</h1>
          <a
            href="/api/auth/logout"
            className="rounded-full bg-[#F1F5F9] px-4 py-1 text-xs text-[#334155] hover:bg-[#e7edf5]"
          >
            {currentUser.nickname || "SecondMe 用户"} / 退出
          </a>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_342px]">
          <article className="panel p-5">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">已注册 Agent 列表</h2>
            <div className="subpanel mt-3 px-3 py-2 text-sm text-[var(--muted)]">搜索昵称 / 状态</div>
            <div className="mt-4">
              <AgentPool />
            </div>
          </article>

          <aside className="panel p-5">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">我的信息</h2>
            <div className="mt-4">
              <UserProfile />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
