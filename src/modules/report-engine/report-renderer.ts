import type { ReportContext } from "./report-context";
import type { ReportDefinition } from "./report-definition";
import { resolveLocalizedText } from "./report-definition";
import type { ReportTheme } from "./report-theme";
import { SectionRegistry, type RenderedSection, type SectionRenderer } from "./section-registry";
import { WidgetRegistry, type RenderedWidget, type WidgetRenderer } from "./widget-registry";
import { readReportFact } from "./report-context";

export type RenderedReport = {
  reportId: string;
  definitionId: string;
  definitionVersion: string;
  assessmentId: string;
  audience: string;
  locale: string;
  direction: string;
  generatedAt: string;
  theme: ReportTheme;
  templateId: string;
  sections: RenderedSection[];
  provenance: ReportContext["provenance"];
};

class DataWidgetRenderer implements WidgetRenderer {
  constructor(readonly id: string) {}
  render(definition: Parameters<WidgetRenderer["render"]>[0], context: ReportContext): RenderedWidget {
    return { id: definition.id, kind: definition.kind, title: resolveLocalizedText(definition.title, context.locale, context.locale), payload: readReportFact(context, definition.dataPath) };
  }
}

class ConfigurationSectionRenderer implements SectionRenderer {
  readonly id = "default";
  render(definition: Parameters<SectionRenderer["render"]>[0], context: ReportContext, widgets: WidgetRegistry): RenderedSection {
    return { id: definition.id, kind: definition.kind, title: resolveLocalizedText(definition.title, context.locale, context.locale) || definition.id, widgets: definition.widgets.map((widget) => widgets.get(widget.rendererId || widget.kind).render(widget, context)) };
  }
}

export class ReportRenderer {
  constructor(private readonly sections: SectionRegistry, private readonly widgets: WidgetRegistry) {}

  render(definition: ReportDefinition, context: ReportContext): RenderedReport {
    const allowed = definition.template.audienceSections?.[context.audience];
    const byId = new Map(definition.sections.map((section) => [section.id, section]));
    const renderedSections = definition.template.sectionOrder.flatMap((id) => {
      const section = byId.get(id);
      if (!section || (section.audiences && !section.audiences.includes(context.audience)) || (allowed && !allowed.includes(id))) return [];
      return [this.sections.get(section.kind).render(section, context, this.widgets)];
    });
    return { reportId: context.reportId, definitionId: definition.id, definitionVersion: definition.version, assessmentId: definition.assessmentId, audience: context.audience, locale: context.locale, direction: context.direction, generatedAt: context.generatedAt, theme: definition.theme, templateId: definition.template.id, sections: renderedSections, provenance: context.provenance };
  }
}

export function createDefaultSectionRegistry(): SectionRegistry { return new SectionRegistry().register(new ConfigurationSectionRenderer()); }

export function registerDataWidgets(registry: WidgetRegistry): WidgetRegistry {
  for (const id of ["text", "metric", "competency-list", "list", "plan", "schedule", "ai-summary", "custom"]) registry.register(new DataWidgetRenderer(id));
  return registry;
}
