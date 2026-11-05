import { redirect } from "next/navigation";

import { AdminClient } from "@/components/admin-client";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");

  return <AdminClient />;
}
