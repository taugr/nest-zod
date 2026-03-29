import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from '@nestjs/swagger';
import { z } from 'zod';

extendZodWithOpenApi(z);

type OpenApiSchemaObject = Extract<
  NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string],
  { type?: string }
>;

let refSeq = 0;

function nextRefId(): string {
  return `NestZod_${Date.now()}_${++refSeq}`;
}

function isOpenApiRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function inlineComponentRefs(
  value: unknown,
  components: Record<string, unknown>,
  seenRefs = new Set<string>(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => inlineComponentRefs(item, components, seenRefs));
  }

  if (!isOpenApiRecord(value)) {
    return value;
  }

  const ref = typeof value.$ref === 'string' ? value.$ref : undefined;
  if (ref?.startsWith('#/components/schemas/')) {
    const refId = ref.slice('#/components/schemas/'.length);
    const target = components[refId];
    if (!target) {
      throw new Error(
        `nest-zod/swagger: failed to resolve OpenAPI component schema (refId: ${refId})`,
      );
    }
    if (seenRefs.has(refId)) {
      throw new Error(
        `nest-zod/swagger: recursive OpenAPI component refs are not supported (refId: ${refId})`,
      );
    }

    const { $ref: _ignored, ...siblings } = value;
    const nextSeenRefs = new Set(seenRefs).add(refId);
    const resolved = inlineComponentRefs(target, components, nextSeenRefs);

    if (!isOpenApiRecord(resolved)) {
      return resolved;
    }
    if (Object.keys(siblings).length === 0) {
      return resolved;
    }

    const resolvedSiblings = inlineComponentRefs(
      siblings,
      components,
      nextSeenRefs,
    ) as Record<string, unknown>;

    return {
      allOf: [resolved],
      ...resolvedSiblings,
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      inlineComponentRefs(child, components, seenRefs),
    ]),
  );
}

/** Options for {@link zodToOpenApiSchema}. */
export type ZodToOpenApiSchemaOptions = {
  /** Stable id for `components.schemas`; generated automatically when omitted. */
  refId?: string;
};

/**
 * Converts a Zod schema to an OpenAPI 3.0 schema object for use with
 * `@nestjs/swagger` decorators.
 */
export function zodToOpenApiSchema(
  schema: z.ZodType,
  options?: ZodToOpenApiSchemaOptions,
): OpenApiSchemaObject {
  const refId = options?.refId ?? nextRefId();
  const registry = new OpenAPIRegistry();
  registry.register(refId, schema);
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const { components } = generator.generateComponents();
  const result = components?.schemas?.[refId];
  if (!result || typeof result !== 'object') {
    throw new Error(
      `nest-zod/swagger: failed to generate OpenAPI schema (refId: ${refId})`,
    );
  }
  return inlineComponentRefs(
    result,
    (components?.schemas ?? {}) as Record<string, unknown>,
  ) as OpenApiSchemaObject;
}

type PipeDef = { type: 'pipe'; in: z.ZodType; out: z.ZodType };
type WrappedSchema =
  | z.ZodOptional<z.ZodType>
  | z.ZodNullable<z.ZodType>
  | z.ZodDefault<z.ZodType>;

function isPipeDef(def: unknown): def is PipeDef {
  return (
    typeof def === 'object' &&
    def !== null &&
    (def as PipeDef).type === 'pipe' &&
    'in' in def &&
    'out' in def
  );
}

function unwrapInputSchema(schema: z.ZodType): z.ZodType {
  const def = schema.def;
  return isPipeDef(def) ? unwrapInputSchema(def.in) : schema;
}

function rebuildWrappedSchema(schema: z.ZodType, wrapper: WrappedSchema): z.ZodType {
  switch (wrapper.def.type) {
    case 'optional':
      return schema.optional();
    case 'nullable':
      return schema.nullable();
    case 'default':
      return schema.default(wrapper.def.defaultValue as z.input<z.ZodType>);
  }
}

function rewriteObjectInputSchema(schema: z.ZodObject): z.ZodType {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, child]) => [key, zodSchemaForInput(child)]),
  );
  const catchall = schema.def.catchall as z.ZodType | undefined;

  if (!catchall) {
    return z.object(shape);
  }
  if (catchall.def.type === 'never') {
    return z.strictObject(shape);
  }
  if (catchall.def.type === 'unknown') {
    return z.looseObject(shape);
  }
  return z.object(shape).catchall(zodSchemaForInput(catchall));
}

function rewriteUnwrappedInputSchema(schema: z.ZodType): z.ZodType {
  switch (schema.def.type) {
    case 'object':
      return rewriteObjectInputSchema(schema as z.ZodObject);
    case 'array':
      return z.array(zodSchemaForInput((schema as z.ZodArray<z.ZodType>).element));
    case 'union':
      return z.union(
        (schema as z.ZodUnion<readonly [z.ZodType, z.ZodType, ...z.ZodType[]]>)
          .options.map((option) => zodSchemaForInput(option)) as [
          z.ZodType,
          z.ZodType,
          ...z.ZodType[],
        ],
      );
    default:
      return schema;
  }
}

function rewriteWrappedInputSchema(schema: z.ZodType): z.ZodType {
  switch (schema.def.type) {
    case 'optional':
    case 'nullable':
    case 'default':
      return rebuildWrappedSchema(
        zodSchemaForInput((schema as WrappedSchema).unwrap()),
        schema as WrappedSchema,
      );
    default:
      return rewriteUnwrappedInputSchema(schema);
  }
}

function unwrapInputObjectSchema(schema: z.ZodType): z.ZodObject | undefined {
  switch (schema.def.type) {
    case 'object':
      return schema as z.ZodObject;
    case 'optional':
    case 'nullable':
    case 'default':
      return unwrapInputObjectSchema((schema as WrappedSchema).unwrap());
    default:
      return undefined;
  }
}

/**
 * Returns the underlying object schema for input docs when the schema is a
 * `z.object(...)` wrapped by `optional`, `nullable`, or `default`.
 */
export function zodInputObjectSchema(schema: z.ZodType): z.ZodObject | undefined {
  return unwrapInputObjectSchema(zodSchemaForInput(schema));
}

/**
 * Returns the schema that represents the input wire format for OpenAPI docs.
 *
 * Supported rewrites are intentionally minimal:
 * - codecs / pipes use their input side
 * - object, array, and union children are rewritten recursively
 * - `optional`, `nullable`, and `default` wrappers are preserved
 */
export function zodSchemaForInput(schema: z.ZodType): z.ZodType {
  return rewriteWrappedInputSchema(unwrapInputSchema(schema));
}

/**
 * Returns the schema that represents the encoded response body for OpenAPI docs.
 *
 * For top-level pipes/codecs, that wire format is the pipe's `in` schema because
 * `schema.encode(...)` emits that shape.
 */
export function zodSchemaForEncodedResponse(schema: z.ZodType): z.ZodType {
  return zodSchemaForInput(schema);
}

/**
 * Narrowing helper: `true` when `schema` is a Zod object (`z.object({ ... })`).
 *
 * Used by the Swagger decorators to emit one OpenAPI query parameter per object key.
 */
export function isZodObjectSchema(schema: z.ZodType): schema is z.ZodObject {
  return zodInputObjectSchema(schema) !== undefined;
}
