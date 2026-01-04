// lib/pdfTemplate.ts
export interface PDFData {
  name: string;
  email: string;
  language: 'en' | 'ar';
  totalPercentage: number;
  competencyResults: Array<{
    competencyId: string;
    name: string;
    nameAr: string;
    score: number;
    maxScore: number;
    percentage: number;
    tier: 'Strength' | 'Opportunity' | 'Threat' | 'Weakness';
    recommendations: string[];
  }>;
  strengths: Array<{ name: string; percentage: number }>;
  opportunities: Array<{ name: string; percentage: number }>;
  threats: Array<{ name: string; percentage: number }>;
  weaknesses: Array<{ name: string; percentage: number }>;
}

export const generatePDFHTML = ( PDFData): string => {
  const { name, language, totalPercentage, competencyResults } = data;
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const fontFamily = isArabic ? "'Tajawal', sans-serif" : "'Inter', sans-serif";

  const competencyList = competencyResults.map(comp => `
    <div style="margin: 10px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h3 style="color: ${
        comp.tier === 'Strength' ? '#10B981' : 
        comp.tier === 'Opportunity' ? '#3B82F6' : 
        comp.tier === 'Threat' ? '#F59E0B' : '#EF4444'
      };">${isArabic ? comp.nameAr : comp.name} (${comp.percentage}%)</h3>
      <p><strong>${isArabic ? 'خطوات العمل:' : 'Action Steps:'}</strong></p>
      <ul style="padding-${isArabic ? 'right' : 'left'}: 20px;">
        ${comp.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <title>${isArabic ? 'تقرير التقييم' : 'Assessment Report'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Tajawal:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: ${fontFamily}; margin: 40px; background: white; }
    .page { page-break-after: always; }
  </style>
</head>
<body>
  <div class="page">
    <h1 style="text-align: center; color: #4f46e5;">${isArabic ? 'تقرير تقييم المبيعات' : 'Sales Assessment Report'}</h1>
    <h2 style="text-align: center;">${name}</h2>
    <div style="text-align: center; font-size: 24px; margin: 20px 0;">${totalPercentage}%</div>
    
    <h3>${isArabic ? 'الكفاءات' : 'Competencies'}</h3>
    ${competencyList}
  </div>
</body>
</html>
  `;
};