import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompetencyResult {
  competency: string;
  score: number;
  category: 'Strength' | 'Opportunity' | 'Threat' | 'Weakness';
  recommendations: string[];
}

export const generateAssessmentPDF = (result: any, userName: string = 'Valued Professional') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const colors = {
    strength: '#22c55e',    // green
    opportunity: '#0ea5e9', // teal
    threat: '#f97316',      // orange
    weakness: '#ef4444',    // red
    primary: '#dc2626',     // brand red
    gray: '#6b7280',
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'Strength': return colors.strength;
      case 'Opportunity': return colors.opportunity;
      case 'Threat': return colors.threat;
      case 'Weakness': return colors.weakness;
      default: return colors.gray;
    }
  };

  // Page 1: Cover
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.text('Outdoor Sales Force', pageWidth / 2, 80, { align: 'center' });
  doc.text('Diagnostic Scan', pageWidth / 2, 110, { align: 'center' });
  doc.setFontSize(28);
  doc.text('Personal Assessment Report', pageWidth / 2, 150, { align: 'center' });
  doc.setFontSize(20);
  doc.text(userName, pageWidth / 2, 180, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, 200, { align: 'center' });
  doc.setFontSize(40);
  doc.text('🎯', pageWidth / 2, 250, { align: 'center' });

  // Page 2: Donut + Interpretation
  doc.addPage();
  doc.setTextColor(0);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Performance', 20, 30);

  const totalScore = result.total_score || 0;
  const donutColor = totalScore >= 80 ? colors.strength : totalScore >= 65 ? colors.opportunity : totalScore >= 50 ? colors.threat : colors.weakness;

  // Donut chart (simplified: solid ring with percentage)
  // Draw the outer circle filled with the donut color
  doc.setFillColor(donutColor);
  doc.circle(105, 140, 50, 'F'); 

  // Draw the inner circle filled with white to create the hole
  doc.setFillColor('#ffffff');
  doc.circle(105, 140, 35, 'F'); 

  doc.setFontSize(36);
  doc.setTextColor(donutColor);
  doc.text(`${totalScore}%`, 105, 145, { align: 'center' });

  const interpretation = totalScore >= 80 ? 'Elite Performer' : totalScore >= 65 ? 'Strong Performer' : totalScore >= 50 ? 'Development Needed' : 'Critical Focus Required';
  doc.setTextColor(0);
  doc.setFontSize(18);
  doc.text(interpretation, 105, 170, { align: 'center' });

  // Page 3: Bar Chart
  doc.addPage();
  doc.setFontSize(28);
  doc.text('Competency Breakdown', 20, 30);

  const competencies: CompetencyResult[] = Object.entries(result.competency_scores || {}).map(([key, value]: [string, any]) => ({
    competency: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: value.score || 0,
    category: value.category || 'Opportunity',
    recommendations: value.recommendations || []
  }));

  competencies.forEach((comp, i) => {
    const y = 60 + i * 28;
    doc.setFillColor(getColor(comp.category));
    doc.rect(20, y - 8, (comp.score / 100) * 170, 16, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(comp.competency, 25, y);
    doc.setTextColor(0);
    doc.text(`${comp.score}%`, 195, y, { align: 'right' });
  });

  // Page 4: SWOT
  doc.addPage();
  doc.setFontSize(28);
  doc.text('SWOT Analysis', 20, 30);

  const strengths = competencies.filter(c => c.category === 'Strength');
  const weaknesses = competencies.filter(c => c.category === 'Weakness');
  const opportunities = competencies.filter(c => c.category === 'Opportunity');
  const threats = competencies.filter(c => c.category === 'Threat');

  autoTable(doc, {
    startY: 50,
    head: [['Strengths', 'Weaknesses']],
    body: [[strengths.map(s => `• ${s.competency}`).join('\n') || '—', weaknesses.map(w => `• ${w.competency}`).join('\n') || '—']],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] },
    columnStyles: { 0: { fillColor: '#f0fdf4' }, 1: { fillColor: '#fef2f2' } }
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Opportunities', 'Threats']],
    body: [[opportunities.map(o => `• ${o.competency}`).join('\n') || '—', threats.map(t => `• ${t.competency}`).join('\n') || '—']],
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] },
    columnStyles: { 0: { fillColor: '#f0f9ff' }, 1: { fillColor: '#fff7ed' } }
  });

  // Page 5: Development Plan
  doc.addPage();
  doc.setFontSize(28);
  doc.text('Personalized Development Plan', 20, 30);

  let yPos = 50;
  competencies
    .filter(c => ['Opportunity', 'Threat', 'Weakness'].includes(c.category))
    .slice(0, 6)
    .forEach(comp => {
      if (yPos > 240) { doc.addPage(); yPos = 30; }
      doc.setFillColor(getColor(comp.category));
      doc.rect(15, yPos - 8, 5, 20, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(getColor(comp.category));
      doc.text(comp.competency, 25, yPos);
      yPos += 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      comp.recommendations.slice(0, 3).forEach(rec => {
        doc.text(`• ${rec}`, 25, yPos);
        yPos += 8;
      });
      yPos += 12;
    });

  // Page 6: Upsell
  doc.addPage();
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(36);
  doc.text('Unlock Your Full Potential', pageWidth / 2, 80, { align: 'center' });
  doc.setFontSize(26);
  doc.text('Outdoor Selling Skills MRI', pageWidth / 2, 120, { align: 'center' });
  doc.setFontSize(18);
  doc.text('Advanced Training • Live Coaching • Proven Tools', pageWidth / 2, 150, { align: 'center' });
  doc.text('Limited Spots Available — Join the Waitlist', pageWidth / 2, 180, { align: 'center' });

  return doc;
};