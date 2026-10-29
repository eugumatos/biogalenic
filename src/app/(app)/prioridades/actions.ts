"use server";

import { revalidatePath } from "next/cache";
import { requireCycle } from "@/lib/session";
import { dbError, text, type ActionResult } from "@/lib/actions";

export async function savePriority(id: string | null, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireCycle();
  if (!s.isMd) return { error: "Solo el Director General gestiona las prioridades." };
  const objective = text(form, "objective");
  if (!objective) return { error: "Indique el objetivo estratégico." };
  const row = {
    objective,
    rationale: text(form, "rationale"),
    expected_impact: text(form, "expected_impact"),
    responsible_id: text(form, "responsible_id"),
    supporting_dimensions: form.getAll("supporting_dimensions").map(String),
    kpi_id: text(form, "kpi_id"),
    kpi_text: text(form, "kpi_text"),
    baseline: text(form, "baseline"),
    target: text(form, "target"),
    deadline: text(form, "deadline"),
    resources: text(form, "resources"),
    risks_dependencies: text(form, "risks_dependencies"),
  };
  const decision = form.get("decision");
  const status = decision === "aprobar" ? "aprobada" : decision === "rechazar" ? "rechazada" : undefined;
  const note = text(form, "decision_note");
  const { error } = id
    ? await s.supabase.from("strategic_priorities").update({ ...row, ...(status ? { status } : {}), ...(note ? { decision_note: note } : {}) }).eq("id", id)
    : await s.supabase.from("strategic_priorities").insert({ ...row, cycle_id: s.cycle.id, source: "manual", status: status ?? "propuesta", decision_note: note });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: status === "aprobada" ? "Prioridad aprobada." : status === "rechazada" ? "Prioridad rechazada." : "Prioridad guardada." };
}

export async function setPriorityStatus(id: string, status: "propuesta" | "aprobada" | "rechazada") {
  const s = await requireCycle();
  if (!s.isMd) return;
  await s.supabase.from("strategic_priorities").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}
