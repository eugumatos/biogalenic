"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { dbError, num, text, type ActionResult } from "@/lib/actions";

export async function saveKpi(id: string | null, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await getSession();
  const dimension_code = text(form, "dimension_code");
  if (!dimension_code || !s.canEditDimension(dimension_code)) return { error: "No tiene permiso sobre los KPIs de esta área." };
  const name = text(form, "name");
  if (!name) return { error: "Indique el nombre del KPI." };
  const row: Record<string, unknown> = {
    dimension_code,
    name,
    definition: text(form, "definition") ?? "",
    formula: text(form, "formula") ?? "",
    unit: text(form, "unit") ?? "",
    frequency: text(form, "frequency") ?? "mensual",
    direction: text(form, "direction") ?? "mayor_mejor",
    owner_id: text(form, "owner_id"),
    baseline: num(form, "baseline"),
    target: num(form, "target"),
    active: form.get("active") !== "off",
  };
  // El trigger registra quién aprueba la meta; solo el MD puede aprobarla.
  if (s.isMd) row.target_approved_by = form.get("approve_target") === "on" && row.target != null ? s.user.id : null;
  const { error } = id ? await s.supabase.from("kpis").update(row).eq("id", id) : await s.supabase.from("kpis").insert(row);
  if (error) return dbError(error);
  revalidatePath("/kpis");
  return { ok: id ? "KPI actualizado." : "KPI creado." };
}

export async function addMeasurement(kpiId: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await getSession();
  const period_start = text(form, "period_start");
  const value = num(form, "value");
  if (!period_start || value == null) return { error: "Indique periodo y valor." };
  const { error } = await s.supabase
    .from("kpi_measurements")
    .upsert({ kpi_id: kpiId, period_start, value, comment: text(form, "comment"), entered_by: s.user.id }, { onConflict: "kpi_id,period_start" });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: "Medición registrada." };
}

export async function deleteMeasurement(id: string) {
  const s = await getSession();
  await s.supabase.from("kpi_measurements").delete().eq("id", id);
  revalidatePath("/", "layout");
}
