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
      className="flex items-center gap-1 text-label-md"
      style={{ color: "var(--accent-default)" }}
    >
      <LogOut className="h-4 w-4" />
      {saliendo ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
