// src/components/ReportPDF.tsx
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { tw } from 'react-pdf-tailwind';

// Register Cairo font (self-hosted)
Font.register({
  family: 'Cairo',
  src: '/fonts/Cairo-Regular.ttf', // Path relative to public
  fontWeight: 400,
});
Font.register({
  family: 'Cairo',
  src: '/fonts/Cairo-Bold.ttf',
  fontWeight: 700,
});

// Tailwind-like styles
const styles = tw`font-Cairo text-base leading-relaxed`;

const ReportPDF = ({ data, lang = 'ar' }) => {
  const isArabic = lang === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'right' : 'left';

  const totalPercentage = 85; // Replace with your calculation

  return (
    <Document>
      <Page size="A4" style={tw`p-10 ${dir}`}>
        {/* Cover Page */}
        <View style={tw`flex flex-col items-center justify-center h-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white`}>
          <Text style={tw`text-4xl font-bold mb-8`}>تقرير تقييم المبيعات الميدانية</Text>
          <Text style={tw`text-2xl mb-12`}>تحليل شامل لأدائك في الميدان</Text>
          <Text style={tw`text-8xl font-bold mb-8`}>{totalPercentage}%</Text>
          <Text style={tw`text-xl`}>{data.user_id} • {new Date().toLocaleDateString(isArabic ? 'ar' : 'en-US')}</Text>
        </View>

        {/* Add more pages here - use View, Text, etc with tw`...` for Tailwind styles */}
        {/* Example second page */}
        <Page style={tw`p-10`}>
          <Text style={tw`text-3xl font-bold text-center mb-8 text-indigo-600`}>نظرة عامة</Text>
          {/* Add your sections, grids, cards */}
        </Page>
      </Page>
    </Document>
  );
};

export const generatePDFBlob = async (data, lang) => {
  const pdfDoc = <ReportPDF data={data} lang={lang} />;
  const blob = await pdf(pdfDoc).toBlob();
  return blob;
};