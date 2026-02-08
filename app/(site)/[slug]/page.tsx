import Link from "next/link";
import { notFound } from "next/navigation";

export default function LanguageEntry({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  // Only allow the two standalone products
  if (slug !== "scan" && slug !== "mri") notFound();

  // Title & subtitle you want (from image_044), but styled like image_037
  const title = "Outdoor Sales";
  const subtitle =
    slug === "mri" ? "Professional Competency MRI" : "Professional Competency Scan";

  return (
    <main className="min-h-screen w-full bg-[#071a3a] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/10 shadow-2xl backdrop-blur-md">
        <div className="px-8 py-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {title}
          </h1>

          <p className="mt-2 text-base font-semibold text-white/90">
            {subtitle}
          </p>

          <p className="mt-6 text-sm text-white/80">
            Choose your language to begin
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Link
              href={`/${slug}/login?lang=en`}
              className="h-12 rounded-xl bg-white text-[#0b1b3a] font-semibold flex items-center justify-center shadow hover:bg-white/90 active:bg-white/80 transition"
            >
              English
            </Link>

            <Link
              href={`/${slug}/login?lang=ar`}
              className="h-12 rounded-xl bg-white text-[#0b1b3a] font-semibold flex items-center justify-center shadow hover:bg-white/90 active:bg-white/80 transition"
            >
              العربية
            </Link>
          </div>

          {/* No footer. No Powered by. No extra text. */}
        </div>
      </div>
    </main>
  );
}
