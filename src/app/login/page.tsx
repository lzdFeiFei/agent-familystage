import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";
import { getCurrentUser } from "@/lib/current-user";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = (await searchParams) || {};
  const error = firstParam(params.error);
  const reason = decodeURIComponent(firstParam(params.reason));
  const hasError = Boolean(error);

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8">
      <main className="mx-auto w-full max-w-[720px]">
        <header className="panel px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Agent FamilyStage</h1>
            <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">
              Beta
            </span>
          </div>
        </header>

        <section className="panel mx-auto mt-8 max-w-[520px] px-8 py-12">
          <h2 className="text-4xl font-bold text-[var(--foreground)]">春节家庭剧场</h2>
          <p className="mt-3 text-base text-[var(--muted)]">和亲友 AI 一起聊起来</p>

          <div className="mt-10">
            <LoginButton />
          </div>

          <div
            className={`mt-6 rounded-xl px-4 py-4 text-sm ${
              hasError ? "alert-error" : "subpanel text-[var(--muted)]"
            }`}
          >
            {hasError ? (
              <p>授权失败：{reason || error}。请点击“使用 SecondMe 登录”重试。</p>
            ) : (
              <p>授权失败时会显示具体原因，并提供一键重试。</p>
            )}
          </div>

          <a
            href="/login"
            className="btn-secondary mt-4 inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            重新登录
          </a>

          <p className="mt-16 text-xs text-[var(--muted)]">登录即代表你同意隐私说明与服务条款</p>
        </section>
      </main>
    </div>
  );
}
