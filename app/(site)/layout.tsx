import { LocaleProvider } from "@/contexts/LocaleContext";
import { SessionContextProvider } from "@/contexts/SessionContext";
import { Toaster } from "@/components/ui/sonner";

/**
 * 🔴 CRITICAL:
 * Force ALL site pages to be runtime-rendered.
 * This prevents Next from trying to pre-render auth/session pages at build time.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SessionContextProvider>
        {children}
        <Toaster />
      </SessionContextProvider>
    </LocaleProvider>
  );
}
