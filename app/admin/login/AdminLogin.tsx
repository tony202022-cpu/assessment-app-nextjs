"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLogin({ returnTo }: { returnTo: string }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/offline-company/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated) window.location.replace(returnTo);
      })
      .catch(() => undefined);
  }, [returnTo]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/offline-company/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      setSecret("");
      window.location.assign(returnTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12">
      <Card className="w-full max-w-md border-white/10 shadow-2xl">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <LockKeyhole />
          </div>
          <CardTitle className="text-2xl">Admin access required</CardTitle>
          <CardDescription>Enter the private activation secret to open the Admin Control Center.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <Label htmlFor="admin-secret">Admin activation secret</Label>
              <Input id="admin-secret" type="password" autoComplete="current-password" className="mt-2 h-11" value={secret} onChange={(event) => setSecret(event.target.value)} required />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {busy ? "Checking…" : "Continue securely"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
