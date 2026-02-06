"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { useSession } from "@/contexts/SessionContext";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { FileText, Download, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const { language } = useLocale();
  const ar = language === "ar";

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace("/language");
      return;
    }

    const fetchAttempts = async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, assessments(name_en, name_ar)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(ar ? "فشل تحميل البيانات" : "Failed to load history");
      } else {
        setAttempts(data || []);
      }
      setLoading(false);
    };

    fetchAttempts();
  }, [user, sessionLoading, router, ar]);

  const handleDownload = async (attemptId: string) => {
    setDownloadingId(attemptId);
    try {
      window.location.href = `/api/generate-pdf?attemptId=${attemptId}&lang=${language}`;
    } catch (error) {
      toast.error(ar ? "فشل التحميل" : "Download failed");
    } finally {
      setTimeout(() => setDownloadingId(null), 3000);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir={ar ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {ar ? "لوحة التحكم" : "Dashboard"}
            </h1>
            <p className="text-slate-500">
              {ar ? "مرحباً بك مجدداً! هنا يمكنك متابعة تقدمك." : "Welcome back! Track your progress here."}
            </p>
          </div>
          <Button 
            onClick={() => router.push("/language")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            {ar ? "بدء تقييم جديد" : "Start New Assessment"}
            <ArrowRight className={ar ? "mr-2 rotate-180" : "ml-2"} size={18} />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {attempts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <FileText className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-xl font-bold text-slate-900">
                {ar ? "لا توجد تقييمات بعد" : "No assessments yet"}
              </h3>
              <p className="text-slate-500 mb-6">
                {ar ? "ابدأ أول تقييم لك الآن للحصول على تقريرك." : "Start your first assessment now to get your report."}
              </p>
              <Button onClick={() => router.push("/language")} variant="outline">
                {ar ? "ابدأ الآن" : "Start Now"}
              </Button>
            </div>
          ) : (
            attempts.map((att) => (
              <div key={att.id} className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xl border-4 border-blue-100">
                    {att.total_percentage}%
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {ar ? att.assessments?.name_ar : att.assessments?.name_en}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {new Date(att.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/${att.assessment_id}/results?attemptId=${att.id}`)}
                    className="rounded-xl font-bold"
                  >
                    {ar ? "عرض النتائج" : "View Results"}
                  </Button>
                  <Button 
                    onClick={() => handleDownload(att.id)}
                    disabled={downloadingId === att.id}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex gap-2"
                  >
                    {downloadingId === att.id ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    {ar ? "تحميل PDF" : "Download PDF"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}