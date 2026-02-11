import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { LoginButton } from "@/components/LoginButton";
import { UserProfile } from "@/components/UserProfile";

export default async function Home() {
  const sessionUserId = await getSessionUserId();
  const currentUser = sessionUserId
    ? await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true, nickname: true },
      })
    : null;
  const isLoggedIn = Boolean(currentUser);
  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-10 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl">
        <section className="surface relative overflow-hidden p-7 sm:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#dbe8ff] blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[#eef3ff] blur-3xl" />
          <div className="relative z-10">
            <p className="text-sm font-medium text-[#4268a5]">SecondMe 集成演示</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#14213d] sm:text-4xl">
              Agent FamilyStage
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5c677d] sm:text-base">
              这个站点已接入 SecondMe OAuth2。登录后可读取并展示你的个人信息与兴趣标签。
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <article className="surface p-6">
            <h2 className="text-lg font-semibold text-[#14213d]">登录状态</h2>
            <p className="mt-2 text-sm text-[#5c677d]">
              {isLoggedIn
                ? `已登录：${currentUser?.nickname || "SecondMe 用户"}`
                : "未登录，请先使用 SecondMe 授权。"}
            </p>
            <div className="mt-5">
              {isLoggedIn ? (
                <a
                  href="/api/auth/logout"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#f1c2c2] bg-[#fff4f4] px-5 text-sm font-semibold text-[#b84b4b] transition-colors hover:bg-[#ffeaea]"
                >
                  退出登录
                </a>
              ) : (
                <LoginButton />
              )}
            </div>
          </article>

          <article className="surface p-6">
            <h2 className="text-lg font-semibold text-[#14213d]">个人信息</h2>
            <div className="mt-4">
              {isLoggedIn ? (
                <UserProfile />
              ) : (
                <p className="text-sm text-[#5c677d]">
                  登录后这里会显示 SecondMe 的用户资料与兴趣标签。
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d6deeb] bg-white p-6">
          <h2 className="text-base font-semibold text-[#14213d]">已启用能力</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["OAuth 登录", "用户基础信息", "兴趣标签（Shades）", "退出登录"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#cad7ef] bg-[#f0f5ff] px-3 py-1 text-xs text-[#365e9b]"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
