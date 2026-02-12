import { redirect } from "next/navigation";
import { RoleplayChat } from "@/components/RoleplayChat";
import { getCurrentUser } from "@/lib/current-user";

type StagePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function StagePage({ params, searchParams }: StagePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const query = (await searchParams) || {};
  const roleParam = firstParam(query.roles);
  const roleKeys = roleParam ? roleParam.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
  const rounds = Number(firstParam(query.rounds)) || undefined;
  const scenarioKey = firstParam(query.scenarioKey) || undefined;
  const topic = firstParam(query.topic) || undefined;
  const sessionId = firstParam(query.sessionId) || undefined;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8">
      <main className="mx-auto w-full max-w-[1240px] space-y-4">
        <header className="panel px-5 py-4">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">会话：{id}</h1>
        </header>
        <RoleplayChat
          initialRoles={roleKeys}
          initialRounds={rounds}
          initialScenarioKey={scenarioKey}
          initialTopic={topic}
          initialSessionId={sessionId}
        />
      </main>
    </div>
  );
}
