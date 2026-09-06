import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center px-8 pb-8 pt-[16vh]">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo/logo_araguaney_white.png"
            alt="Araguaney"
            width={128}
            height={128}
            priority
          />
          <p className="text-label-md-caps text-text-secondary">
            QUINIELA MUNDIAL 2026
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}