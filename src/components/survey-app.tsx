"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ANSWER_FIELDS, SCALE_OPTIONS, TRUST_QUESTION, VARIANT_TEXT, getAnswerField, getScenario } from "@/lib/survey";
import { createSurveyOrder, type CreatedSurveyOrder } from "@/lib/order";
import type { AgeGroup, AnswerField, Gender, ResponsePayload, SurveyAnswers } from "@/lib/types";

type SurveyAppProps = {
  isPretest: boolean;
};

const ageOptions: { value: AgeGroup; label: string }[] = [
  { value: "no_answer", label: "keine Angabe" },
  { value: "under_25", label: "unter 25" },
  { value: "25_39", label: "25-39" },
  { value: "40_59", label: "40-59" },
  { value: "60_plus", label: "60 und älter" },
];

const genderOptions: { value: Gender; label: string }[] = [
  { value: "no_answer", label: "keine Angabe" },
  { value: "female", label: "weiblich" },
  { value: "male", label: "männlich" },
  { value: "diverse", label: "divers" },
];

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-heading)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-[0.6rem] border border-[var(--color-line)] bg-white px-3 text-base text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
      >
        {children}
      </select>
    </div>
  );
}

export function SurveyApp({ isPretest }: SurveyAppProps) {
  const [stage, setStage] = useState<"notice" | "question" | "review" | "thanks">("notice");
  const [noticeConfirmed, setNoticeConfirmed] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("no_answer");
  const [gender, setGender] = useState<Gender>("no_answer");
  const [aiExperience, setAiExperience] = useState<string>("no_answer");
  const [surveyOrder, setSurveyOrder] = useState<CreatedSurveyOrder | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<AnswerField, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedCount = useMemo(
    () => ANSWER_FIELDS.filter((field) => typeof answers[field] === "number").length,
    [answers],
  );

  const currentItem = surveyOrder?.items[currentIndex] ?? null;
  const currentScenario = currentItem ? getScenario(currentItem.scenarioId) : null;
  const currentField = currentItem ? getAnswerField(currentItem.scenarioId, currentItem.variant) : null;
  const currentValue = currentField ? answers[currentField] : undefined;
  const progressValue = surveyOrder ? ((currentIndex + 1) / surveyOrder.items.length) * 100 : 0;

  function startSurvey() {
    if (!noticeConfirmed) {
      setError("Bitte bestätigen Sie den Hinweis, bevor die Befragung startet.");
      return;
    }

    setSurveyOrder(createSurveyOrder());
    setStartedAt(new Date().toISOString());
    setCurrentIndex(0);
    setError(null);
    setStage("question");
  }

  const setAnswer = useCallback((value: number) => {
    if (!currentField) {
      return;
    }

    setAnswers((previous) => ({ ...previous, [currentField]: value }));
    setError(null);
  }, [currentField]);

  const goBack = useCallback(() => {
    setError(null);

    if (stage === "question" && currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
      return;
    }

    if (stage === "review") {
      setStage("question");
      setCurrentIndex((surveyOrder?.items.length ?? 1) - 1);
    }
  }, [currentIndex, stage, surveyOrder]);

  const goNext = useCallback(() => {
    if (!currentField || typeof answers[currentField] !== "number") {
      setError("Bitte wählen Sie einen Skalenwert aus.");
      return;
    }

    if (!surveyOrder) {
      return;
    }

    setError(null);

    if (currentIndex < surveyOrder.items.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      setStage("review");
    }
  }, [answers, currentField, currentIndex, surveyOrder]);

  async function submitSurvey() {
    if (!surveyOrder || !startedAt || completedCount !== ANSWER_FIELDS.length) {
      setError("Bitte beantworten Sie alle 20 Fragen, bevor Sie absenden.");
      return;
    }

    const completedAnswers = ANSWER_FIELDS.reduce((result, field) => {
      const value = answers[field];

      if (typeof value === "number") {
        result[field] = value;
      }

      return result;
    }, {} as Partial<SurveyAnswers>) as SurveyAnswers;

    const payload: ResponsePayload = {
      ...completedAnswers,
      notice_confirmed: true,
      age_group: ageGroup,
      gender,
      ai_experience: aiExperience === "no_answer" ? null : Number(aiExperience),
      scenario_order: surveyOrder.scenarioOrder,
      variant_order: surveyOrder.variantOrder,
      started_at: startedAt,
      is_pretest: isPretest,
    };

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(responseBody?.error ?? "Die Antwort konnte nicht gespeichert werden.");
        return;
      }

      setStage("thanks");
    } catch {
      setError("Die Antwort konnte nicht gesendet werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (stage !== "question") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;

      if (tagName === "SELECT" || tagName === "TEXTAREA" || (tagName === "INPUT" && target?.getAttribute("type") !== "radio")) {
        return;
      }

      if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        setAnswer(Number(event.key));
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, goNext, setAnswer, stage]);

  if (stage === "thanks") {
    return (
      <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 text-[var(--color-text)] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-xl items-center">
          <section className="w-full rounded-[0.75rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Antwort gespeichert
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--color-heading)]">Vielen Dank.</h1>
            <p className="mt-3 text-base leading-relaxed text-[var(--color-muted)]">
              Ihre Antworten wurden anonym gespeichert. Es werden keine Namen, E-Mails oder Freitexte nachträglich abgefragt.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (stage === "notice") {
    return (
      <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-5 text-[var(--color-text)] sm:px-6">
        <section className="mx-auto w-full max-w-2xl rounded-[0.75rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm sm:my-8 sm:p-8">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Interne Befragung
            </p>
            <h1 className="text-2xl font-semibold leading-tight text-[var(--color-heading)]">
              Vertrauen in medizinische KI-Entscheidungen
            </h1>
            {isPretest ? (
              <p className="inline-flex rounded-full border border-[var(--color-line)] px-3 py-1 text-sm font-medium text-[var(--color-muted)]">
                Pretest-Antwort
              </p>
            ) : null}
          </div>

          <div className="mt-7 space-y-3 text-base leading-relaxed text-[var(--color-text)]">
            <p>Die Teilnahme ist freiwillig. Die Antworten werden anonym gespeichert.</p>
            <p>Es werden keine Namen, E-Mails oder Freitexte erhoben.</p>
            <p>Die Befragung kann jederzeit vor dem Absenden abgebrochen werden.</p>
            <p>Bitte nicht teilnehmen, wenn Sie RWU-Professor*in, RWU-Mitarbeiter*in oder RWU-Studierende*r sind.</p>
          </div>

          <div className="mt-7 rounded-[0.65rem] border border-[var(--color-line)] bg-[var(--color-soft)] p-4">
            <label className="flex gap-3 text-base font-medium text-[var(--color-heading)]">
              <input
                type="checkbox"
                checked={noticeConfirmed}
                onChange={(event) => {
                  setNoticeConfirmed(event.target.checked);
                  setError(null);
                }}
                className="mt-1 h-5 w-5 accent-[var(--color-accent)]"
              />
              Ich habe den Hinweis gelesen und möchte freiwillig teilnehmen.
            </label>
          </div>

          <div className="mt-8 grid gap-4">
            <SelectField id="age_group" label="Altersgruppe" value={ageGroup} onChange={(value) => setAgeGroup(value as AgeGroup)}>
              {ageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField id="gender" label="Geschlecht" value={gender} onChange={(value) => setGender(value as Gender)}>
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField id="ai_experience" label="Eigene KI-Erfahrung" value={aiExperience} onChange={setAiExperience}>
              <option value="no_answer">keine Angabe</option>
              <option value="1">1 = sehr gering</option>
              <option value="2">2 = eher gering</option>
              <option value="3">3 = mittel</option>
              <option value="4">4 = eher hoch</option>
              <option value="5">5 = sehr hoch</option>
            </SelectField>
          </div>

          {error ? <p className="mt-5 text-sm font-medium text-[var(--color-danger)]">{error}</p> : null}

          <button
            type="button"
            onClick={startSurvey}
            className="mt-7 min-h-12 w-full rounded-[0.6rem] bg-[var(--color-accent)] px-5 text-base font-semibold text-white transition hover:bg-[var(--color-accent-strong)] active:scale-[0.99]"
          >
            Befragung starten
          </button>
        </section>
      </main>
    );
  }

  if (!surveyOrder || !currentItem || !currentScenario || !currentField) {
    return null;
  }

  if (stage === "review") {
    return (
      <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-5 text-[var(--color-text)] sm:px-6">
        <section className="mx-auto w-full max-w-xl rounded-[0.75rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm sm:my-10 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Zusammenfassung
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--color-heading)]">
            {completedCount} von {ANSWER_FIELDS.length} Antworten vollständig
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--color-muted)]">
            Nach dem Absenden wird die Antwort anonym gespeichert. Danach können Sie die Befragung nicht mehr bearbeiten.
          </p>
          {error ? <p className="mt-5 text-sm font-medium text-[var(--color-danger)]">{error}</p> : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={goBack}
              className="min-h-12 rounded-[0.6rem] border border-[var(--color-line)] px-5 text-base font-semibold text-[var(--color-heading)] transition active:scale-[0.99] sm:flex-1"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={submitSurvey}
              disabled={isSubmitting || completedCount !== ANSWER_FIELDS.length}
              className="min-h-12 rounded-[0.6rem] bg-[var(--color-accent)] px-5 text-base font-semibold text-white transition hover:bg-[var(--color-accent-strong)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            >
              {isSubmitting ? "Speichert" : "Antwort absenden"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] sm:px-6 sm:py-4">
      <section className="mx-auto w-full max-w-2xl">
        <div className="sticky top-0 z-10 -mx-3 border-b border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 sm:-mx-6 sm:px-6 sm:py-3">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-4 text-xs font-medium text-[var(--color-muted)] sm:text-sm">
              <span>
                Frage {currentIndex + 1} von {surveyOrder.items.length}
              </span>
              <span className="hidden sm:inline">{completedCount} beantwortet</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)] sm:mt-2 sm:h-2">
              <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width]" style={{ width: `${progressValue}%` }} />
            </div>
          </div>
        </div>

        <div className="py-3 sm:py-8">
          <div className="rounded-[0.65rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm sm:rounded-[0.75rem] sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
              <span>Szenario {currentScenario.id}</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold leading-tight text-[var(--color-heading)] sm:mt-3 sm:text-2xl">{currentScenario.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)] sm:mt-4 sm:text-base">{currentScenario.text}</p>

            <div
              className={`mt-4 rounded-[0.55rem] border p-3 sm:mt-6 sm:rounded-[0.65rem] sm:p-4 ${
                currentItem.variant === "A" ? "border-sky-300 bg-sky-50" : "border-violet-300 bg-violet-50"
              }`}
            >
              <p className={`text-sm font-semibold ${currentItem.variant === "A" ? "text-sky-950" : "text-violet-950"}`}>
                {VARIANT_TEXT[currentItem.variant].title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text)] sm:mt-2 sm:text-base">{VARIANT_TEXT[currentItem.variant].body}</p>
            </div>

            <fieldset className="mt-5 sm:mt-7">
              <legend className="text-base font-semibold leading-snug text-[var(--color-heading)] sm:text-lg">{TRUST_QUESTION}</legend>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:mt-4 sm:gap-2" role="radiogroup" aria-label={TRUST_QUESTION}>
                {SCALE_OPTIONS.map((option) => (
                  <label key={option.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name={currentField}
                      value={option.value}
                      checked={currentValue === option.value}
                      onChange={() => setAnswer(option.value)}
                      aria-label={`${option.value} = ${option.label}`}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-10 items-center justify-center rounded-[0.5rem] border border-[var(--color-line)] bg-white text-base font-semibold text-[var(--color-heading)] transition peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--color-accent-soft)] peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent)] peer-checked:text-white active:scale-[0.97] sm:min-h-12 sm:rounded-[0.6rem]">
                      {option.value}
                    </span>
                    <span className="mt-1 block text-center text-[0.65rem] font-medium leading-tight text-[var(--color-muted)] sm:hidden">
                      {option.shortLabel}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 hidden gap-2 text-sm text-[var(--color-muted)] sm:grid">
                {SCALE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex gap-2">
                    <span className="w-5 shrink-0 font-semibold text-[var(--color-heading)]">{option.value}</span>
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
              {error ? <p className="mt-4 text-sm font-medium text-[var(--color-danger)]">{error}</p> : null}
            </fieldset>
          </div>

          <div className="mt-3 flex gap-2 sm:mt-4 sm:gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={currentIndex === 0}
              className="min-h-11 flex-1 rounded-[0.55rem] border border-[var(--color-line)] px-4 text-base font-semibold text-[var(--color-heading)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:rounded-[0.6rem] sm:px-5"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={goNext}
              className="min-h-11 flex-1 rounded-[0.55rem] bg-[var(--color-accent)] px-4 text-base font-semibold text-white transition hover:bg-[var(--color-accent-strong)] active:scale-[0.99] sm:min-h-12 sm:rounded-[0.6rem] sm:px-5"
            >
              {currentIndex === surveyOrder.items.length - 1 ? "Zur Übersicht" : "Weiter"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
