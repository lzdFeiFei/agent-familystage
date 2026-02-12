import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect("/stage/live");
}
