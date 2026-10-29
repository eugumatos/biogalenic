import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Dimension, Profile } from "./domain";

export type Cycle = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  company_overview: string | null;
};

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: profile }, { data: managed }, { data: dims }, { data: cycle }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single<Profile>(),
    supabase.from("director_departments").select("dimension_code").eq("user_id", auth.user.id),
    supabase.from("dimensions").select("*").order("sort_order").returns<Dimension[]>(),
    supabase.from("assessment_cycles").select("*").eq("is_active", true).maybeSingle<Cycle>(),
  ]);

  if (!profile) redirect("/login?error=perfil");
  if (!profile.active) redirect("/login?error=inactivo");

  const managedCodes = (managed ?? []).map((m) => m.dimension_code as string);
  const dimensions = (dims ?? []).map((d) => ({ ...d, weight: Number(d.weight) }));
  const isMd = profile.role === "md";

  return {
    supabase,
    user: auth.user,
    profile,
    isMd,
    isDirector: profile.role === "director",
    isReader: profile.role === "lector",
    managedCodes,
    canEditDimension: (code: string) => isMd || (profile.role === "director" && managedCodes.includes(code)),
    dimensions,
    cycle: cycle ?? null,
  };
});

export async function requireMd() {
  const s = await getSession();
  if (!s.isMd) redirect("/tablero?error=permiso");
  return s;
}

export async function requireCycle() {
  const s = await getSession();
  if (!s.cycle) redirect(s.isMd ? "/administracion?tab=ciclos&aviso=sin-ciclo" : "/tablero");
  return { ...s, cycle: s.cycle };
}
