export type ActionResult = { error?: string; ok?: string } | undefined;

/** Traduce errores de Postgres/Supabase a mensajes para el usuario. */
export function dbError(error: { message: string; code?: string } | null): ActionResult {
  if (!error) return undefined;
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return { error: "No tiene permiso para realizar esta acción." };
  }
  // Excepciones lanzadas por los triggers ya vienen en español.
  return { error: error.message };
}

export function text(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function int(form: FormData, key: string): number | null {
  const v = text(form, key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function num(form: FormData, key: string): number | null {
  const v = text(form, key)?.replace(",", ".");
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
