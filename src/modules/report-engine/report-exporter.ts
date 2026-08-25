import type { RenderedReport } from "./report-renderer";

export type ReportExportFormat = "json" | "html" | "pdf" | "docx";
export type ReportExportArtifact = { format: ReportExportFormat; mimeType: string; filename: string; content: string | Uint8Array; metadata?: Readonly<Record<string, unknown>> };
export type ReportExportContext = { requestedBy: string; purpose: string; correlationId?: string };

export interface ReportExportAdapter {
  readonly format: ReportExportFormat;
  export(report: RenderedReport, context: ReportExportContext): Promise<ReportExportArtifact>;
}

export class ReportExporter {
  private readonly adapters = new Map<ReportExportFormat, ReportExportAdapter>();

  register(adapter: ReportExportAdapter): this {
    if (this.adapters.has(adapter.format)) throw new Error(`Report exporter is already registered: ${adapter.format}.`);
    this.adapters.set(adapter.format, adapter);
    return this;
  }

  async export(format: ReportExportFormat, report: RenderedReport, context: ReportExportContext): Promise<ReportExportArtifact> {
    const adapter = this.adapters.get(format);
    if (!adapter) throw new Error(`Report export format is not configured: ${format}.`);
    return adapter.export(report, context);
  }

  supports(format: ReportExportFormat): boolean { return this.adapters.has(format); }
}

export class JsonReportExportAdapter implements ReportExportAdapter {
  readonly format = "json" as const;
  async export(report: RenderedReport): Promise<ReportExportArtifact> {
    return { format: "json", mimeType: "application/json", filename: `${report.reportId}.json`, content: JSON.stringify(report) };
  }
}
