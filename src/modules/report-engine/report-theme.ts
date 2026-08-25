export type ReportTheme = {
  id: string;
  version: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    positive: string;
    warning: string;
    negative: string;
  };
  typography: {
    bodyFont: string;
    headingFont: string;
    arabicFont?: string;
    baseSize: number;
  };
  spacing: { section: number; widget: number };
  logoUrl?: string;
};

export const defaultReportTheme: ReportTheme = {
  id: "career-labs-default",
  version: "1",
  colors: { primary: "#0f172a", secondary: "#1d4ed8", accent: "#d97706", background: "#ffffff", surface: "#f8fafc", text: "#0f172a", mutedText: "#64748b", positive: "#047857", warning: "#b45309", negative: "#be123c" },
  typography: { bodyFont: "Inter, sans-serif", headingFont: "Inter, sans-serif", arabicFont: "IBM Plex Sans Arabic, sans-serif", baseSize: 16 },
  spacing: { section: 32, widget: 16 },
};
