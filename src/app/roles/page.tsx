import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleBindingManager } from "@/components/RoleBindingManager";
import { getCurrentUser } from "@/lib/current-user";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-8">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="surface p-6">
          <p className="text-sm text-[#4268a5]">运营配置</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#14213d]">亲戚角色绑定</h1>
          <p className="mt-2 text-sm text-[#5c677d]">
            把可用 Agent 绑定到七大姑八大姨角色，聊天页会按绑定池随机扮演。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              返回首页
            </Link>
            <Link href="/agents" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              查看角色池
            </Link>
            <Link href="/chat" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              去春节对话
            </Link>
          </div>
        </header>
        <section className="surface p-6">
          <RoleBindingManager />
        </section>
      </main>
    </div>
  );
}
