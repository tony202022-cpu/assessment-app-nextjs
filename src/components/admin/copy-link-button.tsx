"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ path, label = "Copy Link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-2" aria-live="polite">
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

