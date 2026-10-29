"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteEvidence, evidenceUrl, registerEvidence } from "@/app/(app)/departamentos/actions";

export type EvidenceItem = {
  id: string;
  file_name: string;
  description: string | null;
  size_bytes: number | null;
  created_at: string;
  uploaded_by: string;
  uploader_name?: string;
};

const MAX_BYTES = 25 * 1024 * 1024;

export function EvidenceList({
  items,
  canUpload,
  cycleId,
  dimensionCode,
  entityType,
  entityId,
  resolveEntityId,
  currentUserId,
  isMd,
}: {
  items: EvidenceItem[];
  canUpload: boolean;
  cycleId: string;
  dimensionCode: string | null;
  entityType: "assessment" | "risk" | "action" | "kpi";
  entityId?: string | null;
  resolveEntityId?: () => Promise<{ id?: string; error?: string }>;
  currentUserId: string;
  isMd: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg({ error: "Seleccione un archivo." });
    if (file.size > MAX_BYTES) return setMsg({ error: "El archivo supera 25 MB." });
    setBusy(true);
    setMsg(undefined);
    try {
      let id = entityId ?? undefined;
      if (!id && resolveEntityId) {
        const r = await resolveEntityId();
        if (r.error) return setMsg({ error: r.error });
        id = r.id;
      }
      if (!id) return setMsg({ error: "Guarde el registro antes de adjuntar evidencia." });
      const safe = file.name.normalize("NFD").replace(/[^\w.\-]+/g, "_").slice(-120);
      const path = `${cycleId}/${dimensionCode ?? "general"}/${crypto.randomUUID()}-${safe}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("evidencias").upload(path, file, { contentType: file.type || undefined });
      if (error) return setMsg({ error: "No se pudo subir el archivo: " + error.message });
      const r = await registerEvidence({
        cycleId,
        dimensionCode,
        entityType,
        entityId: id,
        path,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        description: description.trim() || null,
      });
      setMsg(r);
      if (!r?.error) {
        setDescription("");
        if (fileRef.current) fileRef.current.value = "";
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    const r = await evidenceUrl(id);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setMsg({ error: r.error });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta evidencia? Quedará registrado en la auditoría.")) return;
    const r = await deleteEvidence(id);
    setMsg(r);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted">Sin evidencia adjunta.</p>
      ) : (
        <ul className="divide-y divide-mist rounded-[4px] border border-rule">
          {items.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <Paperclip size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.file_name}</div>
                <div className="text-xs text-muted">
                  {e.description ? `${e.description} — ` : ""}
                  {e.uploader_name ?? "—"}, {new Date(e.created_at).toLocaleDateString("es-SV")}
                  {e.size_bytes ? `, ${(e.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                </div>
              </div>
              <button type="button" className="text-navy-3 hover:text-navy" onClick={() => download(e.id)} aria-label={`Descargar ${e.file_name}`}>
                <Download size={16} />
              </button>
              {(isMd || e.uploaded_by === currentUserId) && (
                <button type="button" className="text-muted hover:text-rojo" onClick={() => remove(e.id)} aria-label={`Eliminar ${e.file_name}`}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div className="rounded-[4px] bg-mist-2 p-3">
          <p className="mb-2 text-xs text-muted">
            No adjunte información identificable de pacientes ni registros de lote confidenciales. Use resúmenes, reportes de
            gestión o extractos aprobados.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input ref={fileRef} type="file" className="text-sm file:mr-3 file:rounded-[4px] file:border file:border-rule file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy" aria-label="Archivo de evidencia" />
            <input
              className="input sm:flex-1"
              placeholder="Descripción breve (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Descripción de la evidencia"
            />
            <button type="button" className="btn btn-secondary" onClick={upload} disabled={busy}>
              {busy ? "Subiendo…" : "Adjuntar"}
            </button>
          </div>
        </div>
      )}
      {msg?.error && <p role="alert" className="text-sm text-rojo">{msg.error}</p>}
      {msg?.ok && <p role="status" className="text-sm text-verde">{msg.ok}</p>}
    </div>
  );
}
