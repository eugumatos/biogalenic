import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const s = await getSession();
  let approved = 0;
  if (s.cycle) {
    const { data } = await s.supabase
      .from("dimension_assessments")
      .select("dimension_code")
      .eq("cycle_id", s.cycle.id)
      .eq("status", "aprobado");
    approved = data?.length ?? 0;
  }
  return (
    <AppShell
      role={s.profile.role}
      name={s.profile.full_name || s.profile.email}
      cycleName={s.cycle?.name ?? null}
      completion={{ approved, total: s.dimensions.length }}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
