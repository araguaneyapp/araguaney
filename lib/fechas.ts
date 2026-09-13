/**
 * Agrupación de partidos por día calendario, compartida por las pantallas que
 * los organizan en bloques (Quiniela, Inicio).
 */

const CLAVE_SIN_FECHA = "sin-fecha";

/** Clave estable para agrupar partidos del mismo día calendario. */
export function claveDia(inicioUtc: string | null) {
  if (!inicioUtc) return CLAVE_SIN_FECHA;
  const f = new Date(inicioUtc);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}

/** "Martes 17/03". Un partido sin fecha se dice tal cual, no se inventa una. */
export function tituloDia(inicioUtc: string | null) {
  if (!inicioUtc) return "Por programar";
  const f = new Date(inicioUtc);
  const dia = f.toLocaleDateString("es", { weekday: "long" });
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${dd}/${mm}`;
}

export function horaLocal(inicioUtc: string | null) {
  if (!inicioUtc) return "Por definir";
  return new Date(inicioUtc).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
