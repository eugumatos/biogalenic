"use server";

import { revalidatePath } from "next/cache";
import { PHASES } from "@/lib/domain";
import { getSession, requireCycle } from "@/lib/session";
import { dbError, int, text, type ActionResult } from "@/lib/actions";

export async function saveAction(id: string | null, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireCycle();
  if (!s.isMd) return { error: "Solo el Director General define las acciones del plan." };
  const title = text(form, "title");
  if (!title) return { error: "Indique la acción." };
  const row = {
    phase: int(form, "phase") ?? 1,
    title,
    description: text(form, "description"),
    priority_id: text(form, "priority_id"),
    is_quick_win: form.get("is_quick_win") === "on",
    owner_id: text(form, "owner_id"),
    deadline: text(form, "deadline"),
    kpi_text: text(form, "kpi_text"),
    target: text(form, "target"),
  };
  const { error } = id
    ? await s.supabase.from("action_items").update(row).eq("id", id)
    : await s.supabase.from("action_items").insert({ ...row, cycle_id: s.cycle.id });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: id ? "Acción actualizada." : "Acción agregada." };
}

/** Avance: lo actualiza el responsable o el MD. */
export async function updateProgress(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await getSession();
  const status = text(form, "status") ?? "pendiente";
  const progress = Math.max(0, Math.min(100, int(form, "progress") ?? 0));
  const completion_evidence = text(form, "completion_evidence");
  if (status === "completada" && !completion_evidence) return { error: "Para cerrar la acción describa la evidencia de cumplimiento." };
  const { error } = await s.supabase
    .from("action_items")
    .update({ status, progress, comments: text(form, "comments"), completion_evidence })
    .eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: "Avance registrado." };
}

export async function deleteAction(id: string) {
  const s = await getSession();
  if (!s.isMd) return;
  await s.supabase.from("action_items").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/** Carga las actividades base de la metodología (días 30, 60 y 90). */
export async function seedMethodology() {
  const s = await requireCycle();
  if (!s.isMd) return;
  const start = new Date(s.cycle.starts_on + "T12:00:00");
  const at = (d: number) => new Date(start.getTime() + (d - 1) * 86400000).toISOString().slice(0, 10);
  const rows = PHASES.flatMap((p) =>
    p.focus.map((title) => ({
      cycle_id: s.cycle.id,
      phase: p.n,
      title,
      deadline: at(p.n * 30),
      owner_id: s.user.id,
    })),
  );
  await s.supabase.from("action_items").insert(rows);
  revalidatePath("/", "layout");
}
