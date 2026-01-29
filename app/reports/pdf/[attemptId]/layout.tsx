import "../pdf.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* IMPORTANT: dyad-pdf-service waits for THIS selector:
          body[data-pdf-ready="1"]
      */}
      <body data-pdf-ready="1">{children}</body>
    </html>
  );
}
