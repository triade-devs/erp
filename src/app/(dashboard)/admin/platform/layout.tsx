import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) redirect("/");
  return <>{children}</>;
}
