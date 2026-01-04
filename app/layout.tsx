// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans"; // Re-adding Geist font
import { LocaleProvider } from "@/contexts/LocaleContext"; // Re-adding LocaleProvider
import { SessionContextProvider } from "@/contexts/SessionContext"; // Re-adding SessionContextProvider
import { Toaster } from "@/components/ui/sonner"; // Re-adding Toaster

export const metadata: Metadata = {
  title: "Dyad | Field Sales Assessment",
  description: "Discover your true field sales potential with a scientifically-backed behavioral assessment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.className} antialiased`} // Re-applying Geist font
        style={{
          background: 'linear-gradient(to bottom right, #f8fafc, #f0f9ff, #fff7ed)',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        <LocaleProvider>
          <SessionContextProvider>
            {children}
            <Toaster />
          </SessionContextProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}