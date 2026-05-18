"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PasswordFormProps = {
  endpoint: string;
  title: string;
  description: string;
  buttonLabel: string;
};

export function PasswordForm({ endpoint, title, description, buttonLabel }: PasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Die Anmeldung ist fehlgeschlagen.");
        return;
      }

      router.refresh();
    } catch {
      setError("Die Anmeldung konnte nicht gesendet werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 text-[var(--color-text)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-[0.75rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-7"
        >
          <div className="mb-7 space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">
              GAD Mini-Studie
            </p>
            <h1 className="text-2xl font-semibold leading-tight text-[var(--color-heading)]">{title}</h1>
            <p className="text-base leading-relaxed text-[var(--color-muted)]">{description}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-heading)]">
              Passwort
            </label>
            <div className="flex min-h-12 overflow-hidden rounded-[0.6rem] border border-[var(--color-line)] bg-white focus-within:border-[var(--color-accent)] focus-within:ring-4 focus-within:ring-[var(--color-accent-soft)]">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none"
                aria-describedby={error ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="min-h-12 px-4 text-sm font-medium text-[var(--color-accent)] transition active:scale-[0.98]"
              >
                {showPassword ? "verbergen" : "anzeigen"}
              </button>
            </div>
            {error ? (
              <p id="password-error" className="text-sm font-medium text-[var(--color-danger)]">
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 min-h-12 w-full rounded-[0.6rem] bg-[var(--color-accent)] px-5 text-base font-semibold text-white transition hover:bg-[var(--color-accent-strong)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Prüfe Passwort" : buttonLabel}
          </button>
        </form>
      </div>
    </main>
  );
}
