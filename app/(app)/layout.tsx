import { Nav } from "@/src/components/nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
