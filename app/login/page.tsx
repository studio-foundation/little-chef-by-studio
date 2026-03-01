import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
          Little Chef
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Ton meal planner hebdomadaire ND-friendly
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/onboarding" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Continuer avec Google
          </button>
        </form>
      </div>
    </div>
  );
}
