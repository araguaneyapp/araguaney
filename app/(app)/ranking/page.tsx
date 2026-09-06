import { createClient } from "@/lib/supabase-server";
import { Podio } from "@/components/podio";
import { RankingLista } from "@/components/ranking-lista";
import { ScreenHeader } from "@/components/screen-header";

export default async function RankingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ranking } = await supabase
    .from("ranking")
    .select(
      "usuario_id, nombre, puntos_partidos, puntos_clasificados, puntos_especiales, puntos_total, posicion, movimiento"
    )
    .order("posicion", { ascending: true });

  const jugadores = ranking ?? [];

  const top3 = jugadores.slice(0, 3);

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader
        title="Ranking"
        right={
          <span className="text-label-md text-text-secondary">
            {jugadores.length} {jugadores.length === 1 ? "jugador" : "jugadores"}
          </span>
        }
      />

      <Podio top3={top3} />

      <RankingLista jugadores={jugadores} usuarioId={user?.id ?? ""} />
    </main>
  );
}