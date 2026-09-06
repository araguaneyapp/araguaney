/**
 * Envoltorio neutro. La barra de navegación NO vive aquí: solo tiene sentido
 * dentro de un torneo, así que la monta app/(app)/[torneo]/layout.tsx.
 * El hub queda fuera y por eso se ve a pantalla completa.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
