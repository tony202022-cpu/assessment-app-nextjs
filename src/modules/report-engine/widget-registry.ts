import type { ReportContext } from "./report-context";
import type { ReportWidgetDefinition } from "./report-definition";

export type RenderedWidget = {
  id: string;
  kind: string;
  title?: string;
  payload: unknown;
  metadata?: Readonly<Record<string, unknown>>;
};

export interface WidgetRenderer {
  readonly id: string;
  render(definition: ReportWidgetDefinition, context: ReportContext): RenderedWidget;
}

export class WidgetRegistry {
  private readonly renderers = new Map<string, WidgetRenderer>();

  register(renderer: WidgetRenderer): this {
    if (!renderer.id.trim() || this.renderers.has(renderer.id)) throw new Error(`Invalid or duplicate widget renderer: ${renderer.id || "(empty)"}.`);
    this.renderers.set(renderer.id, renderer);
    return this;
  }

  get(id: string): WidgetRenderer {
    const renderer = this.renderers.get(id);
    if (!renderer) throw new Error(`Widget renderer is not registered: ${id}.`);
    return renderer;
  }

  has(id: string): boolean { return this.renderers.has(id); }
}
