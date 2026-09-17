"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * Equivalente a activarGrupo() pero para el SuperAdmin, que no tiene
 * grupo: fija qué torneo está administrando y lo manda directo a
 * /admin, sin pasar por la selección de grupo.
 */
export async function activarTorneoAdmin(torneoSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set("torneo_activo_admin", torneoSlug, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: UN_ANIO_EN_SEGUNDOS,
    path: "/",
  });

  revalidatePath("/admin", "layout");
  redirect("/admin");
}
