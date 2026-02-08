import { LocaleProvider } from "@/contexts/LocaleContext";
import { SessionContextProvider } from "@/contexts/SessionContext";
import { Toaster } from "@/components/ui/sonner";
import Footer from "@/components/footer";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";

  // Hide footer for assessment flows (mobile-first, distraction-free)
  const hideFooter =
    pathname.split("/").length <= 3 || // /{slug}
    pathname.includes("/start") ||
    pathname.includes("/instructions") ||
    pathname.includes("/quiz") ||
    pathname.includes("/results");

  return (
    <LocaleProvider>
      <SessionContextProvider>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>

          {!hideFooter && <Footer />}
        </div>

        <Toaster />
      </SessionContextProvider>
    </LocaleProvider>
  );
}
