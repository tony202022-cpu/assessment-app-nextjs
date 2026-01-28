import type { Metadata } from "next";
import "./globals.css";

import { LocaleProvider } from "@/contexts/LocaleContext";
import { SessionContextProvider } from "@/contexts/SessionContext";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Assessment App",
  description: "Assessment App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr"> {/* Default lang and dir for server render */}
      <body>
        <LocaleProvider> {/* LocaleProvider is a client component */}
          <SessionContextProvider>
            {children}
            <Toaster />
          </SessionContextProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}