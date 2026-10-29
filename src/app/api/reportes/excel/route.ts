import { getSession } from "@/lib/session";
import { loadReport } from "@/lib/report/data";
import { buildWorkbook } from "@/lib/report/excel";

export const maxDuration = 60;

export async function GET() {
  const s = await getSession();
  if (!s.cycle) return new Response("No hay un ciclo activo.", { status: 404 });
  const data = await loadReport(s);
  const buffer = await buildWorkbook(data);
  const name = `Biogalenic-STARS-${data.cycle.name.replace(/[^\w-]+/g, "_")}.xlsx`;
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
