import { DashboardClient } from "@/components/dashboard-client";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return <DashboardClient user={user} openNew={params.new === "1"} />;
}
