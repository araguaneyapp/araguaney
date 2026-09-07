import { Crown } from "lucide-react";

type Jugador = {
  usuario_id: string;
  nombre: string;
  puntos_total: number;
};

function inicial(nombre: string | null) {
  return (nombre ?? "").trim().charAt(0).toUpperCase() || "?";
}

function Puesto({
  jugador,
  lugar,
}: {
  jugador: Jugador;
  lugar: 1 | 2 | 3;
}) {
  const config = {
    1: { aro: "var(--podium-gold)", texto: "var(--podium-gold)", baseBg: "var(--accent-subtle)", alto: "h-[70px]" },
    2: { aro: "var(--podium-silver)", texto: "var(--podium-silver)", baseBg: "var(--surface-card)", alto: "h-[54px]" },
    3: { aro: "var(--podium-bronze)", texto: "var(--podium-bronze)", baseBg: "var(--surface-card)", alto: "h-[54px]" },
  }[lugar];

  const avatarSize = lugar === 1 ? 72 : 56;

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      {lugar === 1 && (
        <Crown className="mb-1 h-5 w-5" style={{ color: "var(--podium-gold)" }} />
      )}
      <span
        className={`flex flex-shrink-0 items-center justify-center rounded-full ${
          lugar === 1 ? "text-display-lg" : "text-display-md"
        }`}
        style={{
          width: avatarSize,
          height: avatarSize,
          border: `2px solid ${config.aro}`,
          color: config.texto,
        }}
      >
        {inicial(jugador.nombre)}
      </span>
      <span
        className="mt-2 w-full truncate text-center text-body-sm"
        title={jugador.nombre}
      >
        {jugador.nombre}
      </span>
      <span className="text-label-md text-text-secondary">
        {jugador.puntos_total} pts
      </span>
      <div
        className={`mt-3 flex w-full items-center justify-center rounded-xl ${config.alto}`}
        style={{ backgroundColor: config.baseBg }}
      >
        <span
          className="text-display-md"
          style={{ color: config.texto }}
        >
          {lugar}
        </span>
      </div>
    </div>
  );
}

export function Podio({ top3 }: { top3: Jugador[] }) {
  const primero = top3[0];
  const segundo = top3[1];
  const tercero = top3[2];

  if (!primero) return null;

  return (
    <div className="mb-6 flex items-end gap-3">
      <div className="min-w-0 flex-1">
        {segundo ? <Puesto jugador={segundo} lugar={2} /> : <div className="flex-1" />}
      </div>
      <div className="min-w-0 flex-1">
        <Puesto jugador={primero} lugar={1} />
      </div>
      <div className="min-w-0 flex-1">
        {tercero ? <Puesto jugador={tercero} lugar={3} /> : <div className="flex-1" />}
      </div>
    </div>
  );
}