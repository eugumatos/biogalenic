"use client";

import { useActionState } from "react";
import { Feedback } from "@/components/feedback";
import { saveRecommendations } from "./actions";

export function RecommendationsForm({ value }: { value: string | null }) {
  const [state, action, pending] = useActionState(saveRecommendations, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="field-label" htmlFor="md_recommendations">Recomendaciones del Director General</label>
      <textarea id="md_recommendations" name="md_recommendations" className="input min-h-40! font-serif text-[1rem]" defaultValue={value ?? ""} placeholder="Mensaje para accionistas, junta directiva y alta dirección: conclusiones, decisiones y solicitudes." />
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>Guardar</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
