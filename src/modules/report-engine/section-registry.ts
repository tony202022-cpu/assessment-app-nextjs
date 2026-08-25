import type { ReportContext } from "./report-context";
import type { ReportSectionDefinition } from "./report-definition";
import type { RenderedWidget, WidgetRegistry } from "./widget-registry";

export type RenderedSection = { id: string; kind: string; title: string; widgets: RenderedWidget[] };

export interface SectionRenderer {
  readonly id: string;
  render(definition: ReportSectionDefinition, context: ReportContext, widgets: WidgetRegistry): RenderedSection;
}

export class SectionRegistry {
  private readonly renderers = new Map<string, SectionRenderer>();

  register(renderer: SectionRenderer): this {
    if (!renderer.id.trim() || this.renderers.has(renderer.id)) throw new Error(`Invalid or duplicate section renderer: ${renderer.id || "(empty)"}.`);
    this.renderers.set(renderer.id, renderer);
    return this;
  }

  get(id: string): SectionRenderer {
    const renderer = this.renderers.get(id) || this.renderers.get("default");
    if (!renderer) throw new Error(`Section renderer is not registered: ${id}.`);
    return renderer;
  }
}
