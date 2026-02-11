import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleplayChat } from "@/components/RoleplayChat";
import { getCurrentUser } from "@/lib/current-user";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-8">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="surface p-6">
          <p className="text-sm text-[#4268a5]">春节模拟现场</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#14213d]">七大姑八大姨对话间</h1>
          <p className="mt-2 text-sm text-[#5c677d]">
            轻度魔幻模式已开启。当前为多 Agent 自动群聊模式，不需要人工输入。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              返回首页
            </Link>
            <Link href="/agents" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              查看角色池
            </Link>
            <Link href="/roles" className="rounded-lg border border-[#d6deeb] bg-white px-3 py-1 hover:bg-[#f2f6ff]">
              绑定角色
            </Link>
          </div>
        </header>
        <section className="surface p-6">
          <RoleplayChat />
        </section>
      </main>
    </div>
  );
}
