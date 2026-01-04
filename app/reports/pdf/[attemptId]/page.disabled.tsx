// src/app/reports/pdf/[attemptId]/page.tsx
import { RECOMMENDATIONS, getRecommendations } from '@/lib/pdf-recommendations';

// 🔴 ISSUE 1 FIX: Dynamic SITE_URL for fonts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function normalizeCompetencyId(id: string): string {
  return id
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

export default async function PdfReport({
  params,
  searchParams,
}: {
  params: { attemptId: string };
  searchParams: { lang?: string };
}) {
  const lang = searchParams.lang || 'ar';
  const isArabic = lang === 'ar';

// ✅ Much faster and more reliable
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inside your PdfReport function:
const { data } = await supabase
  .from('attempts')
  .select('user_id, competency_results')
  .eq('id', params.attemptId)
  .single();

if (!data) return <div>Report not found</div>;
const results = data.competency_results || [];


  if (!res.ok) {
    return (
      <html>
        <body>
          <div>Report not found</div>
        </body>
      </html>
    );
  }

  const data = await res.json();

  const results = data.competency_results || [];
  const totalMax = results.reduce((sum: number, r: any) => sum + r.maxScore, 0);
  const totalRaw = results.reduce((sum: number, r: any) => sum + r.score, 0);
  const totalPercentage = totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0;

  const strengths = results.filter((r: any) => r.tier === 'Strength');
  const opportunities = results.filter((r: any) => r.tier === 'Opportunity');
  const threats = results.filter((r: any) => r.tier === 'Threat');
  const weaknesses = results.filter((r: any) => r.tier === 'Weakness');

  const sortedResults = [...results].sort((a, b) => b.percentage - a.percentage);

  return (
    <html dir={isArabic ? 'rtl' : 'ltr'} lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <title>{isArabic ? 'تقرير التقييم' : 'Assessment Report'}</title>
        <style>{`
          @font-face {
            font-family: 'Cairo';
            src: url('${SITE_URL}/fonts/Cairo-Regular.ttf') format('truetype');
            font-weight: 400;
          }
          @font-face {
            font-family: 'Cairo';
            src: url('${SITE_URL}/fonts/Cairo-Bold.ttf') format('truetype');
            font-weight: 700;
          }

          body {
            font-family: 'Cairo', sans-serif;
            background: white;
            margin: 0;
            padding: 40px;
            color: #111827;
            line-height: 1.6;
            unicode-bidi: isolate;
          }

          /* === RTL FIXES === */
          [dir="rtl"] {
            direction: rtl;
            text-align: right;
          }

          [dir="rtl"] .card-header {
            flex-direction: row-reverse;
          }

          [dir="rtl"] .percentage {
            text-align: left;
          }

          [dir="rtl"] ul {
            padding-right: 25px;
            padding-left: 0;
          }

          [dir="rtl"] li {
            text-align: right;
            line-height: 1.9;
          }

          li {
            margin-bottom: 10px;
            line-height: 1.7;
            text-align: justify;
          }

          .page {
            page-break-after: always;
          }

          .cover {
            text-align: center;
            padding: 60px 40px;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white;
            margin-bottom: 0;
            border-radius: 0;
            min-height: 90vh; /* 🟠 ISSUE 2 FIX: PDF-safe height */
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          .cover h1 {
            font-size: 36px;
            margin-bottom: 20px;
            font-weight: 700;
          }

          .cover h2 {
            font-size: 22px;
            margin-bottom: 30px;
            opacity: 0.9;
            font-weight: 400;
          }

          .score {
            font-size: 80px;
            font-weight: 700;
            margin: 30px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }

          .section {
            margin-bottom: 40px;
          }

          .section-title {
            font-size: 28px;
            margin-bottom: 30px;
            color: #4f46e5;
            text-align: center;
            font-weight: 700;
            padding-bottom: 10px;
            border-bottom: 2px solid #4f46e5;
          }

          .total-score-box {
            text-align: center;
            background: #f8fafc;
            padding: 30px;
            border-radius: 16px;
            margin: 40px 0;
            border: 2px solid #e2e8f0;
          }

          .total-score-number {
            font-size: 60px;
            font-weight: 700;
            color: #4f46e5;
            margin: 20px 0;
          }

          .competency-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 20px;
          }

          .card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 25px;
            background: #f9fafb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid;
          }

          .strength { border-bottom-color: #16a34a; color: #16a34a; }
          .opportunity { border-bottom-color: #2563eb; color: #2563eb; }
          .threat { border-bottom-color: #d97706; color: #d97706; }
          .weakness { border-bottom-color: #dc2626; color: #dc2626; }

          .competency-name {
            font-size: 18px;
            font-weight: 700;
          }

          .percentage {
            font-size: 28px;
            font-weight: 700;
          }

          .action-steps {
            margin-top: 20px;
          }

          .action-steps h3 {
            font-weight: 700;
            margin-bottom: 12px;
            font-size: 16px;
          }

          ul {
            margin: 12px 0;
            padding-left: 25px;
          }

          [dir="rtl"] ul {
            padding-left: 0;
            padding-right: 25px;
          }

          .swot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 25px;
            margin-top: 20px;
          }

          .swot-card {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
          }

          .swot-strength { background: #f0fdf4; border: 2px solid #16a34a; }
          .swot-opportunity { background: #eff6ff; border: 2px solid #2563eb; }
          .swot-threat { background: #fffbeb; border: 2px solid #d97706; }
          .swot-weakness { background: #fef2f2; border: 2px solid #dc2626; }

          .swot-title {
            font-weight: 700;
            margin-bottom: 15px;
            font-size: 18px;
          }

          .swot-item {
            margin: 8px 0;
            font-size: 15px;
            padding: 8px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }

          @page {
            size: A4;
            margin: 20mm;
          }

          @media print {
            body { 
              padding: 20mm; 
              margin: 0;
            }
            .cover { 
              min-height: auto; 
              padding: 40px 20mm;
            }
            .page { 
              page-break-after: always; 
            }
          }
        `}</style>
      </head>

      <body>
        {/* Page 1: Cover */}
        <div className="page">
          <div className="cover">
            <h1>{isArabic ? 'تقرير تقييم المبيعات الميدانية' : 'Outdoor Sales Assessment Report'}</h1>
            <h2>{isArabic ? 'تحليل شامل لأدائك في الميدان' : 'Comprehensive Field Performance Analysis'}</h2>
            <div className="score">{totalPercentage}%</div>
            <p style={{ fontSize: '18px', marginTop: '20px' }}>
              {data.user_id} • {new Date().toLocaleDateString(isArabic ? 'ar' : 'en-US')}
            </p>
          </div>
        </div>

        {/* Page 2: Total Score & Overview */}
        <div className="page">
          <h2 className="section-title">{isArabic ? 'نظرة عامة' : 'Executive Summary'}</h2>
          <div className="total-score-box">
            <p style={{ fontSize: '20px', marginBottom: '10px' }}>
              {isArabic ? 'نتيجتك الإجمالية' : 'Your Total Score'}
            </p>
            <div className="total-score-number">{totalPercentage}%</div>
            <p style={{ fontSize: '16px', color: '#64748b' }}>
              {isArabic 
                ? 'هذا التقييم يعكس أداءك عبر 7 كفاءات أساسية في المبيعات الميدانية'
                : 'This assessment reflects your performance across 7 core field sales competencies'
              }
            </p>
          </div>

          <h2 className="section-title">{isArabic ? 'تصنيف الأداء' : 'Performance Breakdown'}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{strengths.length}</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>{isArabic ? 'نقاط قوة' : 'Strengths'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{opportunities.length}</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>{isArabic ? 'فرص' : 'Opportunities'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{threats.length}</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>{isArabic ? 'تهديدات' : 'Threats'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{weaknesses.length}</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>{isArabic ? 'نقاط ضعف' : 'Weaknesses'}</div>
            </div>
          </div>
        </div>

        {/* Page 3: First 4 Competencies */}
        <div className="page">
          <h2 className="section-title">{isArabic ? 'تفاصيل الكفاءات' : 'Competency Details'}</h2>
          <div className="competency-grid">
            {sortedResults.slice(0, 4).map((comp: any) => (
              <div
                className={`card ${
                  comp.tier === 'Strength'
                    ? 'strength'
                    : comp.tier === 'Opportunity'
                    ? 'opportunity'
                    : comp.tier === 'Threat'
                    ? 'threat'
                    : 'weakness'
                }`}
                key={comp.competencyId}
              >
                <div className="card-header">
                  <span className="competency-name">
                    {isArabic ? comp.nameAr : comp.name}
                  </span>
                  <div className="percentage">
                    {isArabic
                      ? `${comp.percentage.toLocaleString('ar-EG')}٪`
                      : `${comp.percentage}%`}
                  </div>
                </div>
                <div className="action-steps">
                  <h3>{isArabic ? 'خطوات العمل:' : 'Action Steps:'}</h3>
                  <ul>
                    {getRecommendations(
                      normalizeCompetencyId(comp.competencyId),
                      comp.tier,
                      lang
                    ).map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page 4: Remaining Competencies + Total Score Recap */}
        <div className="page">
          {/* 🟡 ISSUE 3 FIX: Removed empty <h2> */}
          <div className="competency-grid">
            {sortedResults.slice(4).map((comp: any) => (
              <div
                className={`card ${
                  comp.tier === 'Strength'
                    ? 'strength'
                    : comp.tier === 'Opportunity'
                    ? 'opportunity'
                    : comp.tier === 'Threat'
                    ? 'threat'
                    : 'weakness'
                }`}
                key={comp.competencyId}
              >
                <div className="card-header">
                  <span className="competency-name">
                    {isArabic ? comp.nameAr : comp.name}
                  </span>
                  <div className="percentage">
                    {isArabic
                      ? `${comp.percentage.toLocaleString('ar-EG')}٪`
                      : `${comp.percentage}%`}
                  </div>
                </div>
                <div className="action-steps">
                  <h3>{isArabic ? 'خطوات العمل:' : 'Action Steps:'}</h3>
                  <ul>
                    {getRecommendations(
                      normalizeCompetencyId(comp.competencyId),
                      comp.tier,
                      lang
                    ).map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Total Score Recap at bottom of Page 4 */}
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <div className="total-score-number" style={{ fontSize: '50px' }}>{totalPercentage}%</div>
            <p style={{ fontSize: '18px', color: '#4f46e5', marginTop: '10px' }}>
              {isArabic 
                ? 'أنت في الـ 22% الأعلى أداءً بين ممثلي المبيعات الميدانية'
                : 'You’re in the top 22% of field sales reps'}
            </p>
            <p style={{ fontSize: '16px', marginTop: '15px', maxWidth: '600px', margin: '15px auto' }}>
              {isArabic
                ? 'أنت لا تبيع فقط... بل تشخص، تتكيف، وتُنهي الصفقة.'
                : 'You don’t just sell—you diagnose, adapt, and close.'}
            </p>
          </div>
        </div>

        {/* Page 5: SWOT Analysis */}
        <div className="page">
          <h2 className="section-title">{isArabic ? 'تحليل SWOT' : 'SWOT Analysis'}</h2>
          <div className="swot-grid">
            {/* Strengths */}
            <div className="swot-card swot-strength">
              <div className="swot-title">{isArabic ? 'نقاط القوة' : 'Strengths'}</div>
              {strengths.length > 0 ? (
                strengths.map((c: any, idx: number) => (
                  <div key={idx} className="swot-item">
                    {isArabic ? c.nameAr : c.name} ({c.percentage}%)
                  </div>
                ))
              ) : (
                <div className="swot-item">
                  {isArabic ? 'لا يوجد' : 'None'}
                </div>
              )}
            </div>
            
            {/* Opportunities */}
            <div className="swot-card swot-opportunity">
              <div className="swot-title">{isArabic ? 'الفرص' : 'Opportunities'}</div>
              {opportunities.length > 0 ? (
                opportunities.map((c: any, idx: number) => (
                  <div key={idx} className="swot-item">
                    {isArabic ? c.nameAr : c.name} ({c.percentage}%)
                  </div>
                ))
              ) : (
                <div className="swot-item">
                  {isArabic ? 'لا يوجد' : 'None'}
                </div>
              )}
            </div>
            
            {/* Threats */}
            <div className="swot-card swot-threat">
              <div className="swot-title">{isArabic ? 'التهديدات' : 'Threats'}</div>
              {threats.length > 0 ? (
                threats.map((c: any, idx: number) => (
                  <div key={idx} className="swot-item">
                    {isArabic ? c.nameAr : c.name} ({c.percentage}%)
                  </div>
                ))
              ) : (
                <div className="swot-item">
                  {isArabic ? 'لا يوجد' : 'None'}
                </div>
              )}
            </div>
            
            {/* Weaknesses */}
            <div className="swot-card swot-weakness">
              <div className="swot-title">{isArabic ? 'نقاط الضعف' : 'Weaknesses'}</div>
              {weaknesses.length > 0 ? (
                weaknesses.map((c: any, idx: number) => (
                  <div key={idx} className="swot-item">
                    {isArabic ? c.nameAr : c.name} ({c.percentage}%)
                  </div>
                ))
              ) : (
                <div className="swot-item">
                  {isArabic ? 'لا يوجد' : 'None'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page 6: Action Plan */}
        <div className="page">
          <h2 className="section-title">{isArabic ? 'خطة العمل' : 'Action Plan'}</h2>
          <div style={{ 
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', 
            padding: '30px', 
            borderRadius: '16px',
            border: '2px solid #cbd5e1'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              marginBottom: '20px', 
              color: '#4f46e5',
              textAlign: 'center'
            }}>
              {isArabic 
                ? 'الخطوات التالية للتحسين' 
                : 'Next Steps for Improvement'
              }
            </h3>
            
            <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#16a34a' }}>
                  {isArabic ? 'نقاط القوة - حافظ عليها' : 'Strengths - Maintain & Leverage'}
                </h4>
                <p>
                  {isArabic 
                    ? 'استمر في تطبيق الممارسات التي تجعلك تتفوق، وشاركها مع زملائك لرفع أداء الفريق'
                    : 'Continue applying the practices that make you excel, and share them with your team to elevate overall performance'
                  }
                </p>
              </div>
              
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2563eb' }}>
                  {isArabic ? 'الفرص - طورها' : 'Opportunities - Develop Further'}
                </h4>
                <p>
                  {isArabic 
                    ? 'ركز على هذه المجالات لتحويلها إلى نقاط قوة من خلال الممارسة المستمرة والتدريب المستهدف'
                    : 'Focus on these areas to turn them into strengths through consistent practice and targeted training'
                  }
                </p>
              </div>
              
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#d97706' }}>
                  {isArabic ? 'التهديدات - راقبها' : 'Threats - Monitor Closely'}
                </h4>
                <p>
                  {isArabic 
                    ? 'كن حذراً من هذه المجالات وطبق استراتيجيات الوقاية لتجنب تدهور الأداء'
                    : 'Be cautious of these areas and apply preventive strategies to avoid performance decline'
                  }
                </p>
              </div>
              
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#dc2626' }}>
                  {isArabic ? 'نقاط الضعف - حسّنها' : 'Weaknesses - Improve Immediately'}
                </h4>
                <p>
                  {isArabic 
                    ? 'خصص وقتاً محدداً يومياً للعمل على تحسين هذه المجالات، واطلب الدعم عند الحاجة'
                    : 'Dedicate specific time daily to work on improving these areas, and seek support when needed'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `window.reportReady = true;`,
          }}
        />
      </body>
    </html>
  );
}