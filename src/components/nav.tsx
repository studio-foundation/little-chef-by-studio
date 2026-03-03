"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/generate", label: "Ma semaine" },
  { href: "/recipes", label: "Recettes" },
  {href:"/history", label: "Historique"},
  { href: "/onboarding", label: "Profil" },

];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/generate" className="flex items-center gap-2">
       <img src="/logo.png" alt="little chef" width={180} height={50} />
        </Link>
        <ul className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={[
                    "pb-0.5 text-sm transition-colors",
                    isActive
                      ? "border-b-2 border-[var(--color-primary)] font-bold text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
