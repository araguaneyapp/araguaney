import { createClient } from "@/lib/supabase-server";
import { TablasGrupos } from "@/components/tablas-grupos";
import { MejoresTerceros } from "@/components/mejores-terceros";

export default async function MundialTablasPage() {
  const supabase = await createClient();

  const { data: tablaGrupos } = await supabase
    .from("tabla_grupos")
    .select("equipo_id, nombre, grupo, codigo_iso, pj, g, e, p, dg, pts, posicion")
    .order("grupo", { ascending: true })
    .order("posicion", { ascending: true });

  const { data: terceros } = await supabase
    .from("mejores_terceros")
    .select("equipo_id, nombre, grupo, codigo_iso, pj, g, e, p, dg, pts, ranking_tercero, clasifica")
    .order("ranking_tercero", { ascending: true });

  return (
    <div>
      <TablasGrupos filas={tablaGrupos ?? []} />
      <MejoresTerceros filas={terceros ?? []} />
    </div>
  );
}