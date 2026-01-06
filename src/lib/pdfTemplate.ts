// src/lib/pdfTemplate.ts

export type PDFData = {
  name: string
  language: "en" | "ar"
  totalPercentage: number
  competencyResults: Array<{
    competencyId: string
    score: number
    maxScore: number
    percentage: number
    tier: "Strength" | "Opportunity" | "Threat" | "Weakness"
  }>
}

export const generatePDFHTML = (data: PDFData): string => {
  const { name, language, totalPercentage, competencyResults } = data

  const isArabic = language === "ar"
  const dir = isArabic ? "rtl" : "ltr"

  // ...keep the rest of your HTML template exactly the same...
  // return `...`
  return `
    <!doctype html>
    <html lang="${language}" dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Report</title>
      </head>
      <body>
        <h1>${isArabic ? "تقرير الأداء" : "Performance Report"}</h1>
        <p>${isArabic ? "الاسم" : "Name"}: ${name}</p>
        <p>${isArabic ? "المجموع" : "Total"}: ${totalPercentage}%</p>

        <pre>${JSON.stringify(competencyResults, null, 2)}</pre>
      </body>
    </html>
  `
}
