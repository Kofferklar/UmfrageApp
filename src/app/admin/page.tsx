import { PasswordForm } from "@/components/password-form";
import { analyzeResponses, type ScenarioAnalysisRow } from "@/lib/analysis";
import { hasSession } from "@/lib/auth";
import { getResponses, getStorageMode } from "@/lib/db";
import { RISK_GROUP_LABELS, SCALE_OPTIONS } from "@/lib/survey";
import type { NullableStats, RiskLevel, StoredSurveyResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ageLabels: Record<string, string> = {
  under_25: "unter 25",
  "25_39": "25-39",
  "40_59": "40-59",
  "60_plus": "60 und älter",
  no_answer: "keine Angabe",
};

const genderLabels: Record<string, string> = {
  female: "weiblich",
  male: "männlich",
  diverse: "divers",
  no_answer: "keine Angabe",
};

const riskOrder: RiskLevel[] = ["low", "medium", "high"];

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatWhole(value: number | null): string {
  return value === null ? "n/a" : String(value);
}

function BarRow({ label, value, tone = "primary" }: { label: string; value: number | null; tone?: "primary" | "secondary" }) {
  const width = value === null ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <div className="grid gap-2" title={`${label}: ${formatNumber(value)}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--color-heading)]">{label}</span>
        <span className="tabular-nums text-[var(--color-muted)]">{formatNumber(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className={tone === "primary" ? "h-full rounded-full bg-[var(--color-accent)]" : "h-full rounded-full bg-[#7d8d85]"}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function StatStrip({ stats }: { stats: NullableStats }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-6">
      <span>
        <b>MW</b> {formatNumber(stats.mean)}
      </span>
      <span>
        <b>Med</b> {formatNumber(stats.median)}
      </span>
      <span>
        <b>Stdabw.</b> {formatNumber(stats.standardDeviation)}
      </span>
      <span>
        <b>Min</b> {formatWhole(stats.min)}
      </span>
      <span>
        <b>Max</b> {formatWhole(stats.max)}
      </span>
      <span>
        <b>IQR</b> {formatNumber(stats.iqr)}
      </span>
    </div>
  );
}

function ScenarioRow({ row }: { row: ScenarioAnalysisRow }) {
  return (
    <article className="border-t border-[var(--color-line)] py-5 first:border-t-0">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
            <span>Szenario {row.scenarioId}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-muted)]" aria-hidden="true" />
            <span>Risiko {row.risk === "low" ? "niedrig" : row.risk === "medium" ? "mittel" : "hoch"}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-[var(--color-heading)]">{row.title}</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Differenz A-B: <span className="font-semibold tabular-nums text-[var(--color-heading)]">{formatNumber(row.difference)}</span>
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Ausreißer: {row.outliers.length > 0 ? row.outliers.join(", ") : "keine nach Median ± 1.5 IQR"}
          </p>
        </div>
        <div className="grid gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--color-heading)]">A: KI empfiehlt</p>
            <StatStrip stats={row.variantA} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--color-heading)]">B: KI entscheidet autonom</p>
            <StatStrip stats={row.variantB} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Distribution({
  title,
  values,
  labels,
}: {
  title: string;
  values: Record<string, number>;
  labels?: Record<string, string>;
}) {
  const entries = Object.entries(values);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="border-t border-[var(--color-line)] pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-[var(--color-heading)]">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-muted)]">Noch keine Angaben.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {entries.map(([key, value]) => {
            const percent = total === 0 ? 0 : (value / total) * 100;
            return (
              <div key={key} className="grid gap-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{labels?.[key] ?? key}</span>
                  <span className="tabular-nums text-[var(--color-muted)]">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
                  <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const isAuthorized = await hasSession("admin");
  const params = (await searchParams) ?? {};
  const includePretestValue = params.includePretest;
  const includePretest = Array.isArray(includePretestValue)
    ? includePretestValue.includes("1")
    : includePretestValue === "1";

  if (!isAuthorized) {
    return (
      <PasswordForm
        endpoint="/api/auth/admin"
        title="Admin-Zugang"
        description="Der Adminbereich zeigt nur aggregierte Auswertung und anonymen CSV-Export."
        buttonLabel="Admin öffnen"
      />
    );
  }

  let allResponses: StoredSurveyResponse[] = [];
  let loadError: string | null = null;

  try {
    allResponses = await getResponses({ includePretest: true });
  } catch {
    loadError = "Die Antworten konnten nicht geladen werden. Bitte prüfen Sie die Datenbank-Konfiguration.";
  }

  const analysis = analyzeResponses(allResponses, { includePretest });
  const exportUrl = includePretest ? "/api/admin/export?includePretest=1" : "/api/admin/export";

  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-5 text-[var(--color-text)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="grid gap-4 border-b border-[var(--color-line)] pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">GAD Admin</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--color-heading)] sm:text-3xl">Auswertung</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--color-muted)]">
              H1 wird über die Risikostufen geprüft. H2 wird über den Vergleich zwischen Empfehlung und autonomer Entscheidung geprüft.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="/admin"
              className={`min-h-11 rounded-[0.6rem] border px-4 py-3 text-center text-sm font-semibold transition active:scale-[0.99] ${
                includePretest
                  ? "border-[var(--color-line)] bg-white text-[var(--color-heading)]"
                  : "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
              }`}
            >
              Pretests ausblenden
            </a>
            <a
              href="/admin?includePretest=1"
              className={`min-h-11 rounded-[0.6rem] border px-4 py-3 text-center text-sm font-semibold transition active:scale-[0.99] ${
                includePretest
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-line)] bg-white text-[var(--color-heading)]"
              }`}
            >
              Pretests einbeziehen
            </a>
            <a
              href={exportUrl}
              className="min-h-11 rounded-[0.6rem] bg-[var(--color-heading)] px-4 py-3 text-center text-sm font-semibold text-white transition active:scale-[0.99]"
            >
              CSV exportieren
            </a>
          </div>
        </header>

        {loadError ? (
          <section className="mt-5 rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 text-[var(--color-danger)] shadow-sm">
            {loadError}
          </section>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-4 shadow-sm">
            <p className="text-sm text-[var(--color-muted)]">Vollständige Antworten</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-heading)]">{analysis.responseCount}</p>
          </div>
          <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-4 shadow-sm">
            <p className="text-sm text-[var(--color-muted)]">Gesamt A: Empfehlung</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-heading)]">{formatNumber(analysis.overall.variantA.mean)}</p>
          </div>
          <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-4 shadow-sm">
            <p className="text-sm text-[var(--color-muted)]">Gesamt B: autonom</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-heading)]">{formatNumber(analysis.overall.variantB.mean)}</p>
          </div>
          <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-4 shadow-sm">
            <p className="text-sm text-[var(--color-muted)]">Mittlere Dauer</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-heading)]">
              {analysis.averageDurationMinutes === null ? "n/a" : `${formatNumber(analysis.averageDurationMinutes)} min`}
            </p>
          </div>
        </section>

        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Speicherung: {getStorageMode() === "upstash-redis" ? "Upstash Redis über Vercel-Integration" : "lokale Entwicklungsdatei"}
        </p>

        {analysis.responseCount === 0 ? (
          <section className="mt-8 rounded-[0.75rem] border border-[var(--color-line)] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-heading)]">Noch keine auswertbaren Antworten.</h2>
            <p className="mt-2 text-base leading-relaxed text-[var(--color-muted)]">
              Standardmäßig werden Pretest-Antworten ausgeblendet. Sobald echte Antworten eingegangen sind, erscheinen hier Tabellen, Balkendiagramme und der CSV-Export.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
              <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-heading)]">A vs. B</h2>
                <div className="mt-5 grid gap-4">
                  <BarRow label="Variante A: KI empfiehlt" value={analysis.overall.variantA.mean} />
                  <BarRow label="Variante B: KI entscheidet autonom" value={analysis.overall.variantB.mean} tone="secondary" />
                </div>
              </div>

              <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-heading)]">Risikogruppen</h2>
                <div className="mt-5 grid gap-4">
                  {riskOrder.map((risk) => (
                    <BarRow key={risk} label={RISK_GROUP_LABELS[risk]} value={analysis.riskGroups[risk].combined.mean} />
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[var(--color-heading)]">Szenarien und Varianten</h2>
              <div className="mt-2 text-sm text-[var(--color-muted)]">
                Skala: {SCALE_OPTIONS.map((option) => `${option.value} = ${option.label}`).join(", ")}
              </div>
              <div className="mt-4">
                {analysis.scenarioRows.map((row) => (
                  <ScenarioRow key={row.scenarioId} row={row} />
                ))}
              </div>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-3">
              <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 shadow-sm">
                <Distribution title="Altersgruppe" values={analysis.sample.age_group} labels={ageLabels} />
              </div>
              <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 shadow-sm">
                <Distribution title="Geschlecht" values={analysis.sample.gender} labels={genderLabels} />
              </div>
              <div className="rounded-[0.75rem] border border-[var(--color-line)] bg-white p-5 shadow-sm">
                <Distribution title="KI-Erfahrung" values={analysis.sample.ai_experience} labels={{ no_answer: "keine Angabe" }} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
