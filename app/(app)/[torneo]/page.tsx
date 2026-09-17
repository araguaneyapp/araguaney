import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Medal,
  Star,
  Trophy,
  Volleyball,
} from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { claveDia, tituloDia, horaLocal } from "@/lib/fechas";
import { plazasClasificacion } from "@/lib/config-torneo";
import { Escudo, type EquipoEscudo } from "@/components/escudo";

type EquipoInicio = EquipoEscudo & { id: number };

type PrediccionPropia = {
  marcador_local: number;
  marcador_visitante: number;
  usuario_id: string;
};

type FilaPartido = {
  id: number;
  gameday_id: number | null;
  inicio_utc: string | null;
  sede: string | null;
  status: string;
  local: EquipoInicio | EquipoInicio[] | null;
  visitante: EquipoInicio | EquipoInicio[] | null;
  predictions: PrediccionPropia[];
};

type PartidoInicio = Omit<FilaPartido, "local" | "visitante"> & {
  local: EquipoInicio | null;
  visitante: EquipoInicio | null;
  prediccion: PrediccionPropia | null;
};

type ExtrasGuardados = {
  campeon_id: number | null;
  subcampeon_id: number | null;
  goleador_id: number | null;
  goleador_nombre: string | null;
};

/** Un partido cuenta como jugado si ya salió publicado, no solo si terminó. */
const ESTADOS_JUGADOS = new Set(["finished", "published"]);

/**
 * Todos los partidos del primer día calendario que aún tenga alguno
 * pendiente. Una vez que los de ese día quedan en `finished`/`published`, la
 * pantalla pasa sola al día siguiente.
 */
function proximoDia(partidos: PartidoInicio[]): PartidoInicio[] {
  const dias: { clave: string; partidos: PartidoInicio[] }[] = [];
  for (const p of partidos) {
    if (p.inicio_utc == null) continue;
    const clave = claveDia(p.inicio_utc);
    const dia = dias.find((d) => d.clave === clave);
    if (dia) dia.partidos.push(p);
    else dias.push({ clave, partidos: [p] });
  }

  const pendiente = dias.find((d) =>
    d.partidos.some((p) => !ESTADOS_JUGADOS.has(p.status))
  );

  return pendiente?.partidos ?? [];
}

function Badge({ predicho }: { predicho: boolean }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-px text-label-sm"
      style={{
        backgroundColor: predicho
          ? "var(--feedback-success-surface)"
          : "var(--feedback-warning-surface)",
        color: predicho ? "var(--feedback-success)" : "var(--feedback-warning)",
      }}
    >
      <span
        className="h-[6px] w-[6px] rounded-full"
        style={{
          backgroundColor: predicho
            ? "var(--feedback-success)"
            : "var(--feedback-warning)",
        }}
      />
      {predicho ? "Predicho" : "Pendiente"}
    </span>
  );
}

function TarjetaPartido({ partido }: { partido: PartidoInicio }) {
  const predicho = partido.prediccion != null;
  const fechaSede = [tituloDia(partido.inicio_utc), partido.sede]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl bg-surface-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-label-md text-text-secondary">
          {fechaSede}
        </span>
        <Badge predicho={predicho} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Escudo equipo={partido.local} size={22} />
          <span className="truncate text-body-sm">
            {partido.local?.nombre ?? "Por definir"}
          </span>
        </div>

        {predicho ? (
          <span className="flex-shrink-0 text-body-md-bold">
            {partido.prediccion?.marcador_local}-{partido.prediccion?.marcador_visitante}
          </span>
        ) : (
          <span
            className="flex-shrink-0 rounded-lg px-2 py-1 text-label-md"
            style={{ backgroundColor: "var(--surface-input)" }}
          >
            {horaLocal(partido.inicio_utc)}
          </span>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="truncate text-body-sm">
            {partido.visitante?.nombre ?? "Por definir"}
          </span>
          <Escudo equipo={partido.visitante} size={22} />
        </div>
      </div>
    </div>
  );
}

/**
 * Fila de "Tus extras" o "Sobre el juego": ícono + título, y a la derecha la
 * selección hecha (con un check) o, si todavía no hay nada, la flecha para ir
 * a elegir. Siempre es un enlace: también sirve para volver a editar.
 */
function FilaAcceso({
  href,
  icono,
  titulo,
  equipo,
  seleccionado,
}: {
  href: string;
  icono: React.ReactNode;
  titulo: string;
  /** Selección con escudo (campeón/subcampeón). */
  equipo?: EquipoInicio | null;
  /** Selección de texto plano (goleador, o "Seleccionados" del Top N). */
  seleccionado?: string | null;
}) {
  const elegido = equipo?.nombre ?? seleccionado ?? null;

  return (
    <div className="rounded-xl bg-surface-card">
      <Link
        href={href}
        className="flex w-full items-center justify-between px-4 py-4"
      >
        <div className="flex items-center gap-3">
          {icono}
          <span className="text-body-md">{titulo}</span>
        </div>
        {elegido ? (
          <span className="flex flex-shrink-0 items-center gap-2">
            {equipo ? (
              <Escudo equipo={equipo} size={22} />
            ) : (
              <Check
                className="h-[18px] w-[18px]"
                style={{ color: "var(--feedback-success)" }}
              />
            )}
            <span className="text-body-sm">{elegido}</span>
          </span>
        ) : (
          <ChevronRight
            className="h-[18px] w-[18px] flex-shrink-0"
            style={{ color: "var(--icons-secondary)" }}
          />
        )}
      </Link>
    </div>
  );
}

export default async function InicioPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const { config } = torneo;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuarioId = user?.id ?? "";
  const necesitaEquipos = config.extras.campeon || config.extras.subcampeon;
  const plazas = plazasClasificacion(config);
  const hayTop = Boolean(config.prediccionClasificacion.tipo && plazas);

  const cookieStore = await cookies();
  const grupoActivo = cookieStore.get("grupo_activo")?.value;

  const [
    { data: perfil },
    { data: fila },
    { data: partidosData },
    { data: extrasData },
    { data: equiposData },
    { count: elegidosTop },
  ] = await Promise.all([
    supabase.from("profiles").select("nombre, es_admin").eq("id", usuarioId).maybeSingle(),
    grupoActivo
      ? supabase
          .from("ranking")
          .select("posicion, puntos_total")
          .eq("group_id", grupoActivo)
          .eq("usuario_id", usuarioId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("matches")
      .select(
        `
        id,
        gameday_id,
        inicio_utc,
        sede,
        status,
        local:teams!equipo_local_id(id, nombre, abreviatura, logo_url, codigo_iso),
        visitante:teams!equipo_visitante_id(id, nombre, abreviatura, logo_url, codigo_iso),
        predictions(marcador_local, marcador_visitante, usuario_id)
      `
      )
      .eq("tournament_id", torneo.id)
      // Filtra el embed, no el padre: igual que en Quiniela, para no traer
      // pronósticos ajenos.
      .eq("predictions.usuario_id", usuarioId)
      .order("inicio_utc", { ascending: true, nullsFirst: false }),
    supabase
      .from("special_predictions")
      .select("campeon_id, subcampeon_id, goleador_id, goleador_nombre")
      .eq("tournament_id", torneo.id)
      .eq("usuario_id", usuarioId)
      .maybeSingle(),
    necesitaEquipos
      ? supabase
          .from("teams")
          .select("id, nombre, abreviatura, logo_url, codigo_iso")
          .eq("tournament_id", torneo.id)
      : Promise.resolve({ data: [] }),
    hayTop
      ? supabase
          .from("standings_predictions")
          .select("equipo_id", { count: "exact", head: true })
          .eq("tournament_id", torneo.id)
          .eq("usuario_id", usuarioId)
      : Promise.resolve({ count: 0 }),
  ]);

  if (perfil?.es_admin) redirect("/admin");

  const partidos: PartidoInicio[] = ((partidosData ?? []) as FilaPartido[]).map(
    (p) => ({
      ...p,
      local: uno(p.local),
      visitante: uno(p.visitante),
      prediccion: p.predictions[0] ?? null,
    })
  );

  const dia = proximoDia(partidos);
  const pendientes = dia.filter((p) => p.prediccion == null).length;

  const topCompleto = hayTop && (elegidosTop ?? 0) >= (plazas ?? 0);

  const extras = (extrasData ?? null) as ExtrasGuardados | null;
  const equipoPorId = new Map(
    ((equiposData ?? []) as EquipoInicio[]).map((e) => [e.id, e])
  );
  const hayExtras =
    config.extras.campeon || config.extras.subcampeon || config.extras.goleador;

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <div className="mb-5">
        <p className="text-body-sm text-text-secondary">Hola,</p>
        <h1 className="text-heading-xl leading-tight">
          {perfil?.nombre || "jugador"} 👋
        </h1>
      </div>

      <div
        className="mb-5 rounded-xl px-4 py-2"
        style={{ backgroundColor: "var(--accent-default)" }}
      >
        <div className="flex flex-col gap-1">
          <div
            className="pb-2 text-label-md-bold"
            style={{
              color: "var(--accent-dark)",
              borderBottom: "1px solid var(--accent-dark)",
            }}
          >
            {torneo.nombre.toUpperCase()}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-label-sm" style={{ color: "var(--accent-dark)" }}>
                Tu posición
              </div>
              <div
                className="text-display-xl leading-none"
                style={{ color: "var(--text-on-accent)" }}
              >
                {fila?.posicion != null ? `${fila.posicion}º` : "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-label-sm" style={{ color: "var(--accent-dark)" }}>
                Tus puntos
              </div>
              <div
                className="text-display-xl leading-none"
                style={{ color: "var(--text-on-accent)" }}
              >
                {fila?.puntos_total ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {dia.length > 0 && (
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-heading-md">Por predecir</h2>
            <span className="text-label-md text-text-secondary">
              {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
            </span>
          </div>

          <div className="mb-3 flex flex-col gap-2">
            {dia.map((partido) => (
              <TarjetaPartido key={partido.id} partido={partido} />
            ))}
          </div>

          <Link
            href={`/${torneo.slug}/quiniela`}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-action-button"
            style={{
              backgroundColor: "var(--accent-default)",
              color: "var(--text-on-accent)",
            }}
          >
            Predecir ahora
            <ArrowRight className="h-[18px] w-[18px]" />
          </Link>
        </div>
      )}

      {(hayTop || hayExtras) && (
        <div className="mb-5">
          <h2 className="mb-3 text-heading-md">Tus extras</h2>
          <div className="flex flex-col gap-2">
            {hayTop && (
              <FilaAcceso
                href={`/${torneo.slug}/quiniela/clasificados`}
                icono={
                  <Star
                    className="h-[18px] w-[18px] flex-shrink-0"
                    style={{ color: "var(--icons-secondary)" }}
                  />
                }
                titulo={`Top ${plazas}`}
                seleccionado={topCompleto ? "Seleccionados" : null}
              />
            )}
            {config.extras.campeon && (
              <FilaAcceso
                href={`/${torneo.slug}/quiniela/extras`}
                icono={
                  <Trophy
                    className="h-[18px] w-[18px] flex-shrink-0"
                    style={{ color: "var(--icons-secondary)" }}
                  />
                }
                titulo="Campeón"
                equipo={
                  extras?.campeon_id != null
                    ? equipoPorId.get(extras.campeon_id) ?? null
                    : null
                }
              />
            )}
            {config.extras.subcampeon && (
              <FilaAcceso
                href={`/${torneo.slug}/quiniela/extras`}
                icono={
                  <Medal
                    className="h-[18px] w-[18px] flex-shrink-0"
                    style={{ color: "var(--icons-secondary)" }}
                  />
                }
                titulo="Subcampeón"
                equipo={
                  extras?.subcampeon_id != null
                    ? equipoPorId.get(extras.subcampeon_id) ?? null
                    : null
                }
              />
            )}
            {config.extras.goleador && (
              <FilaAcceso
                href={`/${torneo.slug}/quiniela/extras`}
                icono={
                  <Volleyball
                    className="h-[18px] w-[18px] flex-shrink-0"
                    style={{ color: "var(--icons-secondary)" }}
                  />
                }
                titulo="Goleador"
                seleccionado={extras?.goleador_nombre ?? null}
              />
            )}
          </div>

          {hayExtras && (
            <Link
              href={`/${torneo.slug}/quiniela/extras`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-action-button"
              style={{
                backgroundColor: "var(--accent-default)",
                color: "var(--text-on-accent)",
              }}
            >
              Predecir ahora
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-heading-md">Sobre el juego</h2>
        <div className="flex flex-col gap-2">
          <FilaAcceso
            href={`/${torneo.slug}/reglas`}
            icono={
              <BookOpen
                className="h-[18px] w-[18px] flex-shrink-0"
                style={{ color: "var(--icons-secondary)" }}
              />
            }
            titulo="Reglas y puntuación"
          />
        </div>
      </div>
    </main>
  );
}
