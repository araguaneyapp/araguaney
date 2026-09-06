import { MundialTabs } from "@/components/mundial-tabs";
import { ScreenHeader } from "@/components/screen-header";

export default function MundialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Mundial" bar={<MundialTabs />} />
      {children}
    </main>
  );
}