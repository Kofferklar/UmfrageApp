import { PasswordForm } from "@/components/password-form";
import { SurveyApp } from "@/components/survey-app";
import { hasSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const isAuthorized = await hasSession("survey");
  const params = (await searchParams) ?? {};
  const pretestValue = params.pretest;
  const isPretest = Array.isArray(pretestValue) ? pretestValue.includes("1") : pretestValue === "1";

  if (!isAuthorized) {
    return (
      <PasswordForm
        endpoint="/api/auth/survey"
        title="Survey-Zugang"
        description="Diese interne Befragung ist nur für direkt eingeladene Teilnehmende gedacht."
        buttonLabel="Survey öffnen"
      />
    );
  }

  return <SurveyApp isPretest={isPretest} />;
}
