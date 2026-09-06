import { Goal, Star, Calculator, Trophy } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";

type Fila = { texto: string; sub?: string; valor: string };

function Seccion({
  icono,
  titulo,
  filas,
}: {
  icono: React.ReactNode;
  titulo: string;
  filas: Fila[];
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        {icono}
        <h2 className="text-heading-md" style={{ color: "var(--accent-default)" }}>
          {titulo}
        </h2>
      </div>
      <div className="rounded-xl bg-surface-card px-4">
        {filas.map((fila, i) => (
          <div
            key={fila.texto}
            className="flex items-center justify-between py-3"
            style={{
              borderBottom: i < filas.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div>
              <div className="text-body-md text-text-secondary">{fila.texto}</div>
              {fila.sub && (
                <div className="mt-px text-label-md text-text-secondary opacity-70">
                  {fila.sub}
                </div>
              )}
            </div>
            <span className="flex-shrink-0 text-body-md-bold">{fila.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReglasPage() {
  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Reglas y puntuación" backHref="/perfil" />

      <Seccion
        icono={<Goal className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />}
        titulo="Resultado de partidos"
        filas={[
          { texto: "Marcador exacto", valor: "5 pts" },
          { texto: "Acertar ganador", valor: "3 pts" },
          { texto: "Empate exacto", valor: "3 pts" },
          { texto: "Acertar que es empate", valor: "1 pt" },
        ]}
      />

      <Seccion
        icono={<Star className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />}
        titulo="Bonus"
        filas={[
          { texto: "Llanero solitario", sub: "Si eres el único que clava el marcador", valor: "+1 pt" },
          { texto: "Quién avanza", sub: "Acertar el equipo que pasa de ronda", valor: "+1 pt" },
        ]}
      />

      <Seccion
        icono={<Calculator className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />}
        titulo="Multiplicadores por fase"
        filas={[
          { texto: "Grupos y dieciseisavos", valor: "×1" },
          { texto: "Octavos", valor: "×2" },
          { texto: "Cuartos · 3er lugar", valor: "×3" },
          { texto: "Semifinales", valor: "×4" },
          { texto: "Final", valor: "×5" },
        ]}
      />

      <Seccion
        icono={<Trophy className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />}
        titulo="Clasificados y extras"
        filas={[
          { texto: "Clasificado de grupo", valor: "1 pt" },
          { texto: "Clasificado + posición", valor: "3 pts" },
          { texto: "Campeón", valor: "10 pts" },
          { texto: "Subcampeón", valor: "5 pts" },
          { texto: "Goleador", valor: "5 pts" },
        ]}
      />
    </main>
  );
}