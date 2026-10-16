import { requireUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings-client";

export default async function SettingsPage() {
  const user = await requireUser();
  return <SettingsView user={user} />;
}
