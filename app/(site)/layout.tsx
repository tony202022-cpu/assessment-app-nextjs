import { LocaleProvider } from "@/contexts/LocaleContext";
import { SessionContextProvider } from "@/contexts/SessionContext";
import { Toaster } from "@/components/ui/sonner";

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
