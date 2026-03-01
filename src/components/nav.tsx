import Link from "next/link";

const navLinks = [
  { href: "/onboarding", label: "Profil" },
  { href: "/generate", label: "Générer" },
  { href: "/recipes", label: "Recettes" },
  { href: "/grocery-list", label: "Épicerie" },
  { href: "/history", label: "Historique" },
];

export function Nav() {
  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/onboarding"
          className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-primary)]"
        >
          Little Chef
        </Link>
        <ul className="flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
