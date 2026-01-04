// src/components/results/PDFDocument.tsx
import { Document, Page, Text, View, Font, StyleSheet } from '@react-pdf/renderer';
import { Cairo } from '@/fonts/cairo'; // Skip if not using Cairo

// Register fonts (optional)
Font.register({
  family: 'Cairo',
  src: '/fonts/Cairo-Regular.ttf',
});
Font.register({
  family: 'Cairo-Bold',
  src: '/fonts/Cairo-Bold.ttf',
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Cairo', // or 'Helvetica'
    direction: 'ltr', // will be overridden per language
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

interface PDFDocumentProps {
  attempt: any;
  language: 'en' | 'ar';
}

export function PDFDocument({ attempt, language }: PDFDocumentProps) {
  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...styles.page,
          direction: language === 'ar' ? 'rtl' : 'ltr',
        }}
      >
        <Text style={styles.title}>
          {language === 'ar' ? 'تقرير التقييم' : 'Assessment Report'}
        </Text>
        {/* Add your actual report content here */}
        <Text>
          {language === 'ar'
            ? `الاسم: ${attempt.user_metadata?.full_name || 'غير معروف'}`
            : `Name: ${attempt.user_metadata?.full_name || 'Unknown'}`}
        </Text>
      </Page>
    </Document>
  );
}