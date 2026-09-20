import { Trophy, Medal, SportShoe } from "lucide-react";
import { Flag } from "@/components/flag";

type Equipo = { nombre: string; codigo_iso: string };

type Extras = {
  goleador_nombre: string | null;
  campeon: Equipo | null;
  subcampeon: Equipo | null;
} | null;

function FaltaElegir() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-label-sm"
      style={{ backgroundColor: "var(--feedback-danger-surface)", color: "var(--feedback-danger)" }}
    >
      <span
        className="h-[6px] w-[6px] rounded-full"
        style={{ backgroundColor: "var(--feedback-danger)" }}
      />
      Falta elegir
    </span>
  );
}

export function TusExtras({ extras }: { extras: Extras }) {
  const campeon = extras?.campeon ?? null;
  const subcampeon = extras?.subcampeon ?? null;
  const goleador = extras?.goleador_nombre ?? null;

  return (
    <div className="mb-5">
      <h2 className="mb-3 text-heading-md">Tus extras</h2>
      <div className="rounded-xl bg-surface-card px-4">
        <div className="flex items-center justify-between border-b border-border py-3">
          <span className="flex items-center gap-2 text-body-sm text-text-tertiary">
            <Trophy className="h-[15px] w-[15px]" style={{ color: "var(--icons-primary)" }} />
            Campeón
          </span>
          {campeon ? (
            <span className="flex items-center gap-2 text-body-sm">
              <Flag iso={campeon.codigo_iso} size={18} />
              {campeon.nombre}
            </span>
          ) : (
            <FaltaElegir />
          )}
        </div>

        <div className="flex items-center justify-between border-b border-border py-3">
          <span className="flex items-center gap-2 text-body-sm text-text-tertiary">
            <Medal className="h-[15px] w-[15px]" style={{ color: "var(--podium-silver)" }} />
            Subcampeón
          </span>
          {subcampeon ? (
            <span className="flex items-center gap-2 text-body-sm">
              <Flag iso={subcampeon.codigo_iso} size={18} />
              {subcampeon.nombre}
            </span>
          ) : (
            <FaltaElegir />
          )}
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2 text-body-sm text-text-tertiary">
            <SportShoe className="h-[15px] w-[15px]" style={{ color: "var(--icons-secondary)" }} />
            Goleador
          </span>
          {goleador ? (
            <span className="text-body-sm">{goleador}</span>
          ) : (
            <FaltaElegir />
          )}
        </div>
      </div>
    </div>
  );
}