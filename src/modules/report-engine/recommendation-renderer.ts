import type { ReportContext } from "./report-context";
import { readReportFact } from "./report-context";
import type { ReportWidgetDefinition } from "./report-definition";
import { resolveLocalizedText } from "./report-definition";
import type { RenderedWidget, WidgetRenderer } from "./widget-registry";

export type RecommendationModel = { id: string; title: string; rationale?: string; actions?: string[]; priority?: string };

export class RecommendationRenderer implements WidgetRenderer {
  readonly id = "recommendation-list";

  render(definition: ReportWidgetDefinition, context: ReportContext): RenderedWidget {
    const recommendations = readReportFact(context, definition.dataPath);
    if (!Array.isArray(recommendations)) throw new Error(`Recommendation widget ${definition.id} requires canonical recommendation records.`);
    return { id: definition.id, kind: "recommendation-list", title: resolveLocalizedText(definition.title, context.locale, context.locale), payload: recommendations as RecommendationModel[] };
  }
}
