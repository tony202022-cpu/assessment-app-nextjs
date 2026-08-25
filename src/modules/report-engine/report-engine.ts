import { ChartRenderer } from "./chart-renderer";
import type { ReportContext } from "./report-context";
import type { ReportDefinition } from "./report-definition";
import { validateReportDefinition } from "./report-definition";
import { RecommendationRenderer } from "./recommendation-renderer";
import { JsonReportExportAdapter, ReportExporter } from "./report-exporter";
import { createDefaultSectionRegistry, registerDataWidgets, ReportRenderer, type RenderedReport } from "./report-renderer";
import { SectionRegistry } from "./section-registry";
import { WidgetRegistry } from "./widget-registry";

export type ReportEngineDependencies = {
  sections?: SectionRegistry;
  widgets?: WidgetRegistry;
  exporter?: ReportExporter;
};

export class ReportEngine {
  readonly sections: SectionRegistry;
  readonly widgets: WidgetRegistry;
  readonly exporter: ReportExporter;
  private readonly renderer: ReportRenderer;

  constructor(dependencies: ReportEngineDependencies = {}) {
    this.sections = dependencies.sections || createDefaultSectionRegistry();
    this.widgets = dependencies.widgets || registerDataWidgets(new WidgetRegistry());
    if (!this.widgets.has("chart")) this.widgets.register(new ChartRenderer());
    if (!this.widgets.has("recommendation-list")) this.widgets.register(new RecommendationRenderer());
    this.exporter = dependencies.exporter || new ReportExporter().register(new JsonReportExportAdapter());
    this.renderer = new ReportRenderer(this.sections, this.widgets);
  }

  render(definition: ReportDefinition, context: ReportContext): RenderedReport {
    const errors = validateReportDefinition(definition);
    if (errors.length) throw new Error(`Invalid report definition: ${errors.join(" ")}`);
    if (context.assessmentId !== definition.assessmentId) throw new Error("Report context does not match the report definition assessment.");
    if (!definition.supportedLocales.includes(context.locale)) throw new Error(`Report locale is not supported: ${context.locale}.`);
    if (context.provenance.reportVersion !== definition.version) throw new Error("Report context version does not match the report definition version.");
    return this.renderer.render(definition, context);
  }
}
