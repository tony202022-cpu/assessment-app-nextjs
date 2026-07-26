"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Plus,
  ShieldAlert,
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

type Fields = Record<string, string>;
type Duplicate = {
  id: string;
  name: string;
  billingEmail: string;
  packageSize: number;
  creditsBalance: number;
  createdAt: string;
};
type Result = {
  company: {
    id: string;
    name: string;
    billingEmail: string;
    packageSize: number;
    creditsBalance: number;
    expiresAt: string | null;
  };
  employeeLink: string;
  managerLink: string;
};

function suggestedExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function ErrorText({ children }: { children?: string }) {
  return children ? <p className="mt-1.5 text-sm text-red-600">{children}</p> : null;
}

function CopyLink({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <Input aria-label={label} readOnly value={value} className="h-11 bg-slate-50 font-mono text-xs" />
      <Button type="button" variant="outline" className="h-11 shrink-0" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export default function OfflineCompanyActivation() {
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [secret, setSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [packageSize, setPackageSize] = useState("25");
  const [quickSize, setQuickSize] = useState<"10" | "25" | "50" | "custom">("25");
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/offline-company/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAuthState(data.authenticated ? "signed-in" : "signed-out"))
      .catch(() => setAuthState("signed-out"));
  }, []);

  const formattedCreatedAt = useMemo(() => {
    if (!duplicate?.createdAt) return "Unknown";
    const date = new Date(duplicate.createdAt);
    return Number.isNaN(date.getTime())
      ? "Unknown"
      : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }, [duplicate]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
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
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/offline-company/session", { method: "DELETE" });
    setResult(null);
    setAuthState("signed-out");
  }

  function chooseSize(value: "10" | "25" | "50" | "custom") {
    setQuickSize(value);
    if (value !== "custom") setPackageSize(value);
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    setDuplicate(null);
    try {
      const response = await fetch("/api/admin/offline-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          billingEmail,
          packageSize: Number(packageSize),
          assessmentType: "outdoor_sales_mri",
          expiresAt:
            expiryEnabled && expiresAt
              ? new Date(`${expiresAt}T23:59:59`).toISOString()
              : null,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthState("signed-out");
        throw new Error("Your admin session expired. Please sign in again.");
      }
      if (!response.ok) {
        setFields(data.fields || {});
        setDuplicate(data.duplicate || null);
        throw new Error(data.error || "Company activation failed.");
      }
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Company activation failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCompanyName("");
    setBillingEmail("");
    setPackageSize("25");
    setQuickSize("25");
    setExpiryEnabled(false);
    setExpiresAt("");
    setFields({});
    setError("");
    setDuplicate(null);
    setResult(null);
  }

  if (authState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
      </main>
    );
  }

  if (authState === "signed-out") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12">
        <Card className="w-full max-w-md border-white/10 shadow-2xl">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <LockKeyhole />
            </div>
            <CardTitle className="text-2xl">Admin access required</CardTitle>
            <CardDescription>Enter the private activation secret to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <Label htmlFor="admin-secret">Admin activation secret</Label>
                <Input
                  id="admin-secret"
                  type="password"
                  autoComplete="current-password"
                  className="mt-2 h-11"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  required
                />
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <Button className="h-11 w-full" disabled={authBusy}>
                {authBusy ? <Loader2 className="animate-spin" /> : <KeyRound />}
                {authBusy ? "Checking…" : "Continue securely"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Admin tools</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Offline Company Activation
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Create a company account for a client who paid outside the online checkout.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>

        {result ? (
          <Card className="overflow-hidden border-emerald-200 shadow-lg">
            <div className="bg-emerald-600 px-6 py-7 text-white">
              <Check className="mb-4 h-10 w-10 rounded-full bg-white/20 p-2" />
              <h2 className="text-2xl font-black">Company Activated Successfully</h2>
              <p className="mt-1 text-emerald-50">The company and shared employee token were created atomically.</p>
            </div>
            <CardContent className="space-y-6 p-6">
              <dl className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                {[
                  ["Company name", result.company.name],
                  ["HR email", result.company.billingEmail],
                  ["Package size", String(result.company.packageSize)],
                  ["Credits available", String(result.company.creditsBalance)],
                  ["Company ID", result.company.id],
                  ["Token expiry", result.company.expiresAt ? new Date(result.company.expiresAt).toLocaleString() : "No expiry"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 break-all font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <Label>Employee assessment link</Label>
                <CopyLink value={result.employeeLink} label="Employee assessment link" />
              </div>
              <div>
                <Label>Manager dashboard link</Label>
                <CopyLink value={result.managerLink} label="Manager dashboard link" />
                <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  Keep this link private. It provides access to company assessment results and reports.
                </div>
              </div>
              <Button type="button" className="h-11" onClick={reset}>
                <Plus /> Create another company
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Building2 />
                </div>
                <div>
                  <CardTitle>Company details</CardTitle>
                  <CardDescription>One shared employee token will be created for this package.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={activate} className="space-y-6" noValidate>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="company-name">Company name</Label>
                    <Input id="company-name" className="mt-2 h-11" placeholder="ABC Trading Company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    <ErrorText>{fields.companyName}</ErrorText>
                  </div>
                  <div>
                    <Label htmlFor="billing-email">HR or billing email</Label>
                    <Input id="billing-email" type="email" className="mt-2 h-11" placeholder="hr@abctrading.com" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                    <ErrorText>{fields.billingEmail}</ErrorText>
                  </div>
                </div>
                <div>
                  <Label>Number of credits</Label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(["10", "25", "50", "custom"] as const).map((value) => (
                      <Button key={value} type="button" variant={quickSize === value ? "default" : "outline"} onClick={() => chooseSize(value)}>
                        {value === "custom" ? "Custom" : value}
                      </Button>
                    ))}
                  </div>
                  {quickSize === "custom" && (
                    <Input type="number" min={1} max={100000} step={1} className="mt-3 h-11" placeholder="Enter credits" value={packageSize} onChange={(e) => setPackageSize(e.target.value)} />
                  )}
                  <ErrorText>{fields.packageSize}</ErrorText>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="assessment-type">Assessment type</Label>
                    <Input id="assessment-type" className="mt-2 h-11 bg-slate-50" value="outdoor_sales_mri" readOnly />
                    <ErrorText>{fields.assessmentType}</ErrorText>
                  </div>
                  <div>
                    <Label>Token expiry (optional)</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={!expiryEnabled ? "default" : "outline"}
                        onClick={() => {
                          setExpiryEnabled(false);
                          setExpiresAt("");
                        }}
                      >
                        No Expiry
                      </Button>
                      <Button
                        type="button"
                        variant={expiryEnabled ? "default" : "outline"}
                        onClick={() => {
                          setExpiryEnabled(true);
                          setExpiresAt((current) => current || suggestedExpiry());
                        }}
                      >
                        Set Expiry
                      </Button>
                    </div>
                    {expiryEnabled && (
                      <Input
                        id="expires-at"
                        type="date"
                        className="mt-3 h-11"
                        value={expiresAt}
                        onChange={(event) => setExpiresAt(event.target.value)}
                      />
                    )}
                    <p className="mt-1.5 text-xs text-slate-500">
                      No expiry by default. Enable this only when the team token should expire.
                    </p>
                    <ErrorText>{fields.expiresAt}</ErrorText>
                  </div>
                </div>

                {duplicate && (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Possible duplicate — activation cancelled</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                        <span><strong>Company:</strong> {duplicate.name}</span>
                        <span><strong>Email:</strong> {duplicate.billingEmail}</span>
                        <span><strong>Package:</strong> {duplicate.packageSize}</span>
                        <span><strong>Credits:</strong> {duplicate.creditsBalance}</span>
                        <span><strong>Created:</strong> {formattedCreatedAt}</span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                {error && !duplicate && <Alert variant="destructive"><AlertTitle>Activation failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={reset} disabled={busy}>Reset</Button>
                  <Button className="min-w-44" disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" /> : <Building2 />}
                    {busy ? "Activating company…" : "Activate Company"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
