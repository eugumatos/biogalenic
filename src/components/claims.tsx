import clsx from "clsx";
import { CLAIM_LABEL, type Claim, type ClaimType } from "@/lib/ai/schema";

const mark: Record<ClaimType, string> = {
  hecho_verificado: "border-navy",
  interpretacion: "border-saline",
  hipotesis: "border-dashed border-ambar-line",
  recomendacion: "border-navy-3",
};

export function ClaimList({ claims, empty = "Sin elementos." }: { claims: Claim[] | undefined; empty?: string }) {
  if (!claims?.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {claims.map((c, i) => (
        <li key={i} className={clsx("border-l-2 pl-3", mark[c.tipo])}>
          <div className="text-[0.72rem] font-semibold text-muted">
            {CLAIM_LABEL[c.tipo]}
            {c.fuentes.length > 0 && <span className="font-normal"> · fuentes: {c.fuentes.join(", ")}</span>}
          </div>
          <p className="text-[0.92rem] leading-snug">{c.texto}</p>
        </li>
      ))}
    </ul>
  );
}

export function ClaimLegend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {(Object.keys(CLAIM_LABEL) as ClaimType[]).map((t) => (
        <span key={t} className={clsx("border-l-2 pl-1.5", mark[t])}>
          {CLAIM_LABEL[t]}
        </span>
      ))}
    </p>
  );
}
