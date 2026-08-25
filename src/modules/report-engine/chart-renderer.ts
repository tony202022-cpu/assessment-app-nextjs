import type { ReportContext } from "./report-context";
import type { ReportWidgetDefinition } from "./report-definition";
import { resolveLocalizedText } from "./report-definition";
import { readReportFact } from "./report-context";
import type { RenderedWidget, WidgetRenderer } from "./widget-registry";

export type ChartDatum = { label: string; value: number; color?: string };
export type ChartModel = { type: "bar" | "radar" | "line" | "donut"; series: ChartDatum[]; min?: number; max?: number };

export class ChartRenderer implements WidgetRenderer {
  readonly id = "chart";

  render(definition: ReportWidgetDefinition, context: ReportContext): RenderedWidget {
    const model = readReportFact(context, definition.dataPath) as ChartModel | undefined;
    if (!model || !Array.isArray(model.series)) throw new Error(`Chart widget ${definition.id} requires a pre-calculated chart model.`);
    return { id: definition.id, kind: "chart", title: resolveLocalizedText(definition.title, context.locale, context.locale), payload: model };
  }
}
