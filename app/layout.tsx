"use client"; // Make this a client component

import type { Metadata } from "next";
import "./globals.css";

import { LocaleProvider, useLocale } from "@/contexts/LocaleContext"; // Import useLocale
import { SessionContextProvider } from "@/contexts/SessionContext";
import { Toaster } from "@/components/ui/sonner";

// Metadata can still be exported from a client component, but it won't be used for SEO
// if the component is client-rendered. For dynamic metadata, consider using generateMetadata
// in a server component or a client-side solution if truly dynamic.
// For now, we'll keep it as is, but be aware of this limitation.
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
    <LocaleProvider>
      <LayoutContent>{children}</LayoutContent>
    </LocaleProvider>
  );
}

// New client component to wrap children and use useLocale
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { language, direction } = useLocale();

  return (
    <html lang={language} dir={direction}>
      <body>
        <SessionContextProvider>
          {children}
          <Toaster />
        </SessionContextProvider>
      </body>
    </html>
  );
}