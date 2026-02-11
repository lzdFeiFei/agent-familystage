import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentPool } from "@/components/AgentPool";
import { getCurrentUser } from "@/lib/current-user";

export default async function AgentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-8">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="surface p-6">
          <p className="text-sm text-[#4268a5]">Agent FamilyStage</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#14213d]">亲友 Agent 角色池</h1>
          <p className="mt-2 text-sm text-[#5c677d]">
            已授权用户会自动加入公开角色池，所有登录用户可参与春节模拟。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              返回首页
            </Link>
            <Link href="/roles" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              去角色绑定
            </Link>
            <Link href="/chat" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              去春节对话
            </Link>
          </div>
        </header>
        <section className="surface p-6">
          <AgentPool />
        </section>
      </main>
    </div>
  );
}
