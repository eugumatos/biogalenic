import clsx from "clsx";
import { STARS, type StarsScenario } from "@/lib/domain";

/**
 * Los cinco escenarios STARS como una sola secuencia. Principal: bloque navy sólido.
 * Secundarios: contorno navy. Propuesta de la IA: marca "IA" cuando difiere o aún no hay decisión.
 */
export function StarsTrack({
  primary,
  secondary = [],
  aiPrimary,
  aiSecondary = [],
  approved,
  size = "lg",
}: {
  primary: StarsScenario | null;
  secondary?: StarsScenario[];
  aiPrimary?: StarsScenario | null;
  aiSecondary?: StarsScenario[];
  approved: boolean;
  size?: "lg" | "md";
}) {
  return (
    <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Clasificación STARS">
      {STARS.map((s) => {
        const isPrimary = primary === s.key;
        const isSecondary = secondary.includes(s.key);
        const aiMark = aiPrimary === s.key ? "IA · principal" : aiSecondary.includes(s.key) ? "IA · secundario" : null;
        return (
          <li
            key={s.key}
            aria-label={`${s.name}${isPrimary ? ", principal" : isSecondary ? ", secundario" : ""}`}
            aria-current={isPrimary ? "true" : undefined}
            className={clsx(
              "relative flex min-w-0 flex-col justify-between rounded-[4px] border p-2 sm:p-3",
              size === "lg" ? "min-h-[64px] sm:min-h-[150px]" : "min-h-[56px] sm:min-h-[92px]",
              isPrimary
                ? approved
                  ? "border-navy bg-navy text-white"
                  : "border-navy bg-navy/85 text-white [background-image:repeating-linear-gradient(135deg,transparent_0_8px,rgba(255,255,255,.06)_8px_16px)]"
                : isSecondary
                  ? "border-2 border-navy bg-white text-navy"
                  : "border-rule bg-mist-2 text-muted",
            )}
          >
            <span
              className={clsx(
                "font-bold leading-none tracking-tight",
                size === "lg" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl",
              )}
              aria-hidden
            >
              {s.letter}
            </span>
            <span className="mt-2 hidden sm:block">
              <span className={clsx("block text-[0.7rem] leading-tight font-semibold sm:text-sm", !isPrimary && !isSecondary && "font-normal")}>
                {s.name}
              </span>
              <span className={clsx("block text-[0.65rem] sm:text-xs", isPrimary ? "text-white/75" : "text-muted")}>
                {isPrimary ? (approved ? "Principal" : "Principal · sin aprobar") : isSecondary ? "Secundario" : " "}
              </span>
              {aiMark && (
                <span className={clsx("mt-1 hidden text-[0.65rem] sm:block", isPrimary ? "text-white/75" : "text-navy-3")}>{aiMark}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
