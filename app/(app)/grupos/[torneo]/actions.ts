"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * Marca un grupo como el "activo": lo que hace que "/" salte directo a
 * Inicio en la próxima visita en vez de mostrar el selector. La invoca
 * tanto el <form action={}> de la lista de grupos como, imperativamente,
 * el cliente de "crear grupo" tras el RPC.
 */
export async function activarGrupo(grupoId: number, torneoSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set("grupo_activo", String(grupoId), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: UN_ANIO_EN_SEGUNDOS,
    path: "/",
  });

  redirect(`/${torneoSlug}`);
}
