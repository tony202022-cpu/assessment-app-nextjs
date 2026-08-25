import type { AssessmentDefinition } from "./assessment-definition";
import { assessmentDefinitionKey } from "./assessment-definition";
import { AssessmentLoader } from "./assessment-loader";
import { smeBusinessHealthAssessmentDefinition } from "./sme/sme-assessment-definition";

export class AssessmentRegistry {
  private readonly byKey = new Map<string, Readonly<AssessmentDefinition>>();
  private readonly slugOwners = new Map<string, string>();
  private readonly idSlugs = new Map<string, string>();

  constructor(definitions: readonly unknown[] = [], private readonly loader = new AssessmentLoader()) {
    for (const definition of this.loader.loadMany(definitions)) this.registerValidated(definition);
  }

  register(value: unknown): this {
    this.registerValidated(this.loader.load(value));
    return this;
  }

  get(id: string, version: string): Readonly<AssessmentDefinition> | undefined { return this.byKey.get(`${id}@${version}`); }

  require(id: string, version: string): Readonly<AssessmentDefinition> {
    const definition = this.get(id, version);
    if (!definition) throw new Error(`Assessment definition is not registered: ${id}@${version}.`);
    return definition;
  }

  findBySlug(slug: string, version: string): Readonly<AssessmentDefinition> | undefined {
    const owner = this.slugOwners.get(slug);
    return owner ? this.get(owner, version) : undefined;
  }

  list(): ReadonlyArray<Readonly<AssessmentDefinition>> { return Array.from(this.byKey.values()); }

  private registerValidated(definition: Readonly<AssessmentDefinition>) {
    const key = assessmentDefinitionKey(definition);
    if (this.byKey.has(key)) throw new Error(`Duplicate assessment ID and version: ${key}.`);
    const slugOwner = this.slugOwners.get(definition.metadata.slug);
    if (slugOwner && slugOwner !== definition.metadata.id) throw new Error(`Duplicate assessment slug: ${definition.metadata.slug}.`);
    const existingSlug = this.idSlugs.get(definition.metadata.id);
    if (existingSlug && existingSlug !== definition.metadata.slug) throw new Error(`Assessment ID ${definition.metadata.id} cannot change its canonical slug in the registry.`);
    this.byKey.set(key, definition);
    this.slugOwners.set(definition.metadata.slug, definition.metadata.id);
    this.idSlugs.set(definition.metadata.id, definition.metadata.slug);
  }
}

/** SME is the sole characterized production definition in this proof of concept. */
export const assessmentRegistry = new AssessmentRegistry([smeBusinessHealthAssessmentDefinition]);
