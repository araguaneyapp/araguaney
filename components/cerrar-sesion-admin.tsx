"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export function CerrarSesionAdmin() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  const cerrarSesion = async () => {
    setSaliendo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={cerrarSesion}
      disabled={saliendo}
      className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
      style={{
        border: "1px solid var(--accent-default)",
        color: "var(--accent-default)",
        opacity: saliendo ? 0.6 : 1,
      }}
    >
      <LogOut className="h-[17px] w-[17px]" />
      {saliendo ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
