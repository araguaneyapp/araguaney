import { LogoLoader } from "@/components/logo-loader";

export default function Loading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center">
      <LogoLoader />
    </main>
  );
}
