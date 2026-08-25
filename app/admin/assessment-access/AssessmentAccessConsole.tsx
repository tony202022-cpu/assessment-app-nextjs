"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FlaskConical,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Assessment = {
  assessmentId: string;
  slug: string;
  title: string;
  languages: Array<"en" | "ar">;
  timerMinutes: number;
  totalQuestions: number;
};

type TestAttempt = {
  id: string;
  assessmentId: string;
  assessmentSlug: string;
  assessmentTitle?: string;
  language: "en" | "ar";
  email: string;
  attemptId: string;
  createdAt: string;
  status: "ready" | "completed";
  launchValid: boolean;
  launchState?: "available" | "used" | "expired";
  launchUrl?: string | null;
  reportUrl?: string | null;
};

export default function AssessmentAccessConsole() {
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in">(
    "loading",
  );
  const [secret, setSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [history, setHistory] = useState<TestAttempt[]>([]);
  const [assessmentSlug, setAssessmentSlug] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<TestAttempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.slug === assessmentSlug),
    [assessments, assessmentSlug],
  );

  async function loadConsole() {
    setLoadingData(true);
    setError("");
    try {
      const response = await fetch("/api/admin/assessment-access", {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthState("signed-out");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load System Tools.");
      setAssessments(data.assessments || []);
      setHistory(data.history || []);
      setAssessmentSlug((current) => current || data.assessments?.[0]?.slug || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load System Tools.");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    fetch("/api/admin/offline-company/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const state = data.authenticated ? "signed-in" : "signed-out";
        setAuthState(state);
        if (state === "signed-in") void loadConsole();
      })
      .catch(() => setAuthState("signed-out"));
  }, []);

  useEffect(() => {
    if (selectedAssessment && !selectedAssessment.languages.includes(language)) {
      setLanguage(selectedAssessment.languages[0] || "en");
    }
  }, [selectedAssessment, language]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/admin/offline-company/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      setSecret("");
      setAuthState("signed-in");
      await loadConsole();
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/offline-company/session", { method: "DELETE" });
    setGenerated(null);
    setHistory([]);
    setAuthState("signed-out");
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setGenerated(null);
    try {
      const response = await fetch("/api/admin/assessment-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentSlug, language }),
      });
      const data = await response.json();
      if (response.status === 401) setAuthState("signed-out");
      if (!response.ok) throw new Error(data.error || "Could not generate the attempt.");
      setGenerated(data.test);
      setHistory((current) => [data.test, ...current].slice(0, 25));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate the attempt.");
    } finally {
      setBusy(false);
    }
  }

  if (authState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  if (authState === "signed-out") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <KeyRound className="mb-2 h-10 w-10 text-blue-600" />
            <CardTitle>Administrator access required</CardTitle>
            <CardDescription>
              Sign in with the existing private administrator secret.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <Label htmlFor="admin-secret">Administrator secret</Label>
              <Input
                id="admin-secret"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                required
              />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <Button className="w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
                Continue securely
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
              Private administrator tool
            </p>
            <h1 className="mt-2 text-3xl font-black">System Tools</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Create one fresh internal attempt and launch the normal assessment experience
              without payment, coupons, company credits, or credentials.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="text-blue-700" /> Generate a fresh test attempt
            </CardTitle>
            <CardDescription>
              Every click creates exactly one clearly marked developer-test identity and attempt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generate} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="assessment">Assessment</Label>
                  <select
                    id="assessment"
                    className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={assessmentSlug}
                    onChange={(event) => setAssessmentSlug(event.target.value)}
                    disabled={loadingData || busy}
                  >
                    {assessments.map((assessment) => (
                      <option key={assessment.assessmentId} value={assessment.slug}>
                        {assessment.title}
                      </option>
                    ))}
                  </select>
                  {selectedAssessment && (
                    <p className="mt-2 text-xs text-slate-500">
                      {selectedAssessment.totalQuestions} questions ·{" "}
                      {selectedAssessment.timerMinutes} minutes
                    </p>
                  )}
                </div>

                {selectedAssessment && selectedAssessment.languages.length > 1 && (
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={language}
                      onChange={(event) =>
                        setLanguage(event.target.value === "ar" ? "ar" : "en")
                      }
                      disabled={busy}
                    >
                      {selectedAssessment.languages.map((item) => (
                        <option key={item} value={item}>
                          {item === "ar" ? "Arabic" : "English"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>System Tools error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {generated && (
                <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>Fresh test attempt ready</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <p className="break-all">{generated.email}</p>
                    <p className="text-xs">
                      The launch link expires in one hour. No password or email inbox is required.
                    </p>
                    {generated.launchUrl && (
                      <Button
                        type="button"
                        onClick={() =>
                          window.open(generated.launchUrl!, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink /> Launch Assessment
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col items-start justify-between gap-4 border-t pt-5 sm:flex-row sm:items-center">
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Admin-only, allowlisted, rate-limited, expiring, and audited.
                </p>
                <Button disabled={busy || loadingData || !assessmentSlug}>
                  {busy ? <Loader2 className="animate-spin" /> : <FlaskConical />}
                  {busy ? "Generating…" : "Generate Fresh Test Attempt"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent developer tests</CardTitle>
              <CardDescription>
                Only attempts created by this private tool appear here.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void loadConsole()}
              disabled={loadingData}
            >
              <RefreshCw className={loadingData ? "animate-spin" : ""} /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                No developer test attempts yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Assessment</th>
                      <th className="px-3 py-3">Identity</th>
                      <th className="px-3 py-3">Created</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((test) => {
                      const assessment = assessments.find(
                        (item) => item.assessmentId === test.assessmentId,
                      );
                      return (
                        <tr key={test.id} className="border-b last:border-0">
                          <td className="px-3 py-4 font-medium">
                            {test.assessmentTitle || assessment?.title || test.assessmentSlug}
                            <span className="ml-2 text-xs uppercase text-slate-500">
                              {test.language}
                            </span>
                          </td>
                          <td className="max-w-xs break-all px-3 py-4 text-xs">
                            {test.email}
                          </td>
                          <td className="px-3 py-4">
                            {new Date(test.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-4 capitalize">{test.status}</td>
                          <td className="px-3 py-4">
                            <div className="flex gap-2">
                              {test.launchUrl && test.launchValid && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    window.open(
                                      test.launchUrl!,
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                >
                                  Launch
                                </Button>
                              )}
                              {test.reportUrl && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      test.reportUrl!,
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                >
                                  Report
                                </Button>
                              )}
                              {!test.launchUrl && test.launchState && (
                                <span className="text-xs text-slate-500">
                                  {test.launchState === "used" ? "Used" : "Expired"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
