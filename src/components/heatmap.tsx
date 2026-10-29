import clsx from "clsx";
import Link from "next/link";

type R = { probability: number; impact: number; escalated?: boolean };

function cellTone(score: number) {
  if (score >= 15) return "bg-rojo-soft text-rojo";
  if (score >= 10) return "bg-ambar-soft text-ambar";
  if (score >= 5) return "bg-saline-soft text-navy-3";
  return "bg-mist-2 text-muted";
}

/** Matriz 5×5 impacto (vertical) × probabilidad (horizontal). Las celdas muestran el número de riesgos abiertos. */
export function Heatmap({ risks, hrefBase, compact }: { risks: R[]; hrefBase?: string; compact?: boolean }) {
  const count = (p: number, i: number) => risks.filter((r) => r.probability === p && r.impact === i);
  const size = compact ? "h-9" : "h-12 sm:h-14";
  return (
    <figure>
      <div className="flex gap-2">
        <div className="flex w-4 items-center justify-center">
          <span className="-rotate-90 text-xs whitespace-nowrap text-muted">Impacto</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-[1.25rem_repeat(5,minmax(0,1fr))] gap-1">
            {[5, 4, 3, 2, 1].map((i) => (
              <div key={i} className="contents">
                <div className="flex items-center justify-end pr-1 text-xs tabular-nums text-muted">{i}</div>
                {[1, 2, 3, 4, 5].map((p) => {
                  const list = count(p, i);
                  const esc = list.some((r) => r.escalated);
                  const body = (
                    <div
                      className={clsx(
                        "flex items-center justify-center rounded-[3px] text-sm font-semibold tabular-nums",
                        size,
                        cellTone(p * i),
                        esc && "ring-2 ring-rojo ring-inset",
                        list.length === 0 && "font-normal opacity-60",
                      )}
                      title={`Probabilidad ${p} × Impacto ${i} = ${p * i}. ${list.length} riesgo(s)${esc ? ", incluye escalados" : ""}.`}
                    >
                      {list.length || ""}
                    </div>
                  );
                  return hrefBase && list.length ? (
                    <Link key={p} href={`${hrefBase}${hrefBase.includes("?") ? "&" : "?"}p=${p}&i=${i}`} aria-label={`${list.length} riesgos con probabilidad ${p} e impacto ${i}`}>
                      {body}
                    </Link>
                  ) : (
                    <div key={p}>{body}</div>
                  );
                })}
              </div>
            ))}
            <div />
            {[1, 2, 3, 4, 5].map((p) => (
              <div key={p} className="pt-1 text-center text-xs tabular-nums text-muted">{p}</div>
            ))}
          </div>
          <div className="mt-0.5 text-center text-xs text-muted">Probabilidad</div>
        </div>
      </div>
      {!compact && (
        <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-rojo-soft align-middle ring-1 ring-rojo/30" />Crítico 15–25</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-ambar-soft align-middle ring-1 ring-ambar/30" />Alto 10–14</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-saline-soft align-middle" />Medio 5–9</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-mist-2 align-middle ring-1 ring-rule" />Bajo 1–4</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-[2px] align-middle ring-2 ring-rojo" />Contiene riesgos escalados</span>
        </figcaption>
      )}
    </figure>
  );
}
