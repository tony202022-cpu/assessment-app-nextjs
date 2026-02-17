import Link from "next/link";
import { notFound } from "next/navigation";

export default function LanguageEntry({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  // Only allow the two standalone products
  if (slug !== "scan" && slug !== "mri") notFound();

  const title = "Outdoor Sales";
  const subtitle = slug === "mri" ? "Professional Competency MRI" : "Professional Competency Scan";

  return (
    <main className="min-h-screen w-full bg-[#071a3a] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white/10 border border-white/15 shadow-2xl backdrop-blur-md">
        <div className="px-10 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            {title}
          </h1>

          <p className="mt-3 text-lg md:text-xl font-semibold text-white/90">
            {subtitle}
          </p>

          <p className="mt-7 text-base md:text-lg text-white/80">
            Choose your language to begin
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link
              href={`/${slug}/login?lang=en`}
              className="h-14 md:h-16 rounded-2xl bg-white text-[#0b1b3a] text-lg font-bold flex items-center justify-center shadow hover:bg-white/90 active:bg-white/80 transition"
            >
              English
            </Link>

            <Link
              href={`/${slug}/login?lang=ar`}
              className="h-14 md:h-16 rounded-2xl bg-white text-[#0b1b3a] text-lg font-bold flex items-center justify-center shadow hover:bg-white/90 active:bg-white/80 transition"
            >
              Arabic
            </Link>
          </div>

          {/* No footer. No Powered by. */}
        </div>
      </div>
    </main>
  );
}
