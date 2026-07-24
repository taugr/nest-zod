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

type NullishValue = null | undefined;
type ZodDef = z.ZodType['def'] & {
  type: string;
  coerce?: boolean;
  innerType?: z.ZodType;
  in?: z.ZodType;
  left?: z.ZodType;
  options?: z.ZodType[];
  right?: z.ZodType;
  values?: NullishValue[];
};

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

function acceptsCoercedNullishValue(
  type: string,
  value: NullishValue,
): boolean {
  return value === null || type === 'string' || type === 'boolean';
}

/**
 * Determines nullish input acceptance without running refinements, transforms,
 * preprocessors, or codecs. OpenAPI cannot represent those runtime checks, and
 * executing an async one from synchronous metadata generation throws.
 *
 * @internal
 */
export function zodSchemaAcceptsNullishValue(
  schema: z.ZodType,
  value: NullishValue,
  seen = new Set<z.ZodType>(),
): boolean {
  if (seen.has(schema)) {
    return false;
  }

  const nextSeen = new Set(seen).add(schema);
  const def = schema.def as ZodDef;

  if (def.coerce === true) {
    return acceptsCoercedNullishValue(def.type, value);
  }

  switch (def.type) {
    case 'any':
    case 'unknown':
    case 'custom':
    case 'transform':
    case 'catch':
      return true;
    case 'null':
      return value === null;
    case 'undefined':
    case 'void':
      return value === undefined;
    case 'literal':
      return def.values!.includes(value);
    case 'optional':
    case 'default':
    case 'prefault':
      return (
        value === undefined ||
        zodSchemaAcceptsNullishValue(def.innerType!, value, nextSeen)
      );
    case 'nullable':
      return (
        value === null ||
        zodSchemaAcceptsNullishValue(def.innerType!, value, nextSeen)
      );
    case 'nonoptional':
      return (
        value !== undefined &&
        zodSchemaAcceptsNullishValue(def.innerType!, value, nextSeen)
      );
    case 'readonly':
    case 'success':
      return zodSchemaAcceptsNullishValue(def.innerType!, value, nextSeen);
    case 'pipe':
      return zodSchemaAcceptsNullishValue(def.in!, value, nextSeen);
    case 'union':
      return def.options!.some((option) =>
        zodSchemaAcceptsNullishValue(option, value, nextSeen),
      );
    case 'intersection':
      return (
        zodSchemaAcceptsNullishValue(def.left!, value, nextSeen) &&
        zodSchemaAcceptsNullishValue(def.right!, value, nextSeen)
      );
    case 'lazy': {
      const getter = (def as ZodDef & { getter: () => z.ZodType }).getter;
      return zodSchemaAcceptsNullishValue(getter(), value, nextSeen);
    }
    default:
      return false;
  }
}

/** Returns whether a schema accepts `undefined` without executing user code. */
export function zodSchemaAcceptsUndefined(schema: z.ZodType): boolean {
  return zodSchemaAcceptsNullishValue(schema, undefined);
}

function collectNestedZodSchemas(
  value: unknown,
  schemas: Set<z.ZodType>,
  visitedObjects = new Set<object>(),
): void {
  if (value instanceof z.ZodType) {
    if (schemas.has(value)) {
      return;
    }
    schemas.add(value);
    collectNestedZodSchemas(value.def, schemas, visitedObjects);
    return;
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    visitedObjects.has(value)
  ) {
    return;
  }
  visitedObjects.add(value);

  for (const nestedValue of Object.values(value)) {
    collectNestedZodSchemas(nestedValue, schemas, visitedObjects);
  }

  if ((value as { type?: unknown }).type === 'lazy') {
    const getter = (value as { getter: () => unknown }).getter;
    collectNestedZodSchemas(getter(), schemas, visitedObjects);
  }
}

function withSynchronousOpenApiIntrospection<T>(
  schema: z.ZodType,
  generate: () => T,
): T {
  const schemas = new Set<z.ZodType>();
  collectNestedZodSchemas(schema, schemas);
  const originals = new Map<z.ZodType, PropertyDescriptor>();

  try {
    for (const nestedSchema of schemas) {
      const originalDescriptor = Reflect.getOwnPropertyDescriptor(
        nestedSchema,
        'safeParse',
      )!;
      const originalSafeParse = nestedSchema.safeParse;
      originals.set(nestedSchema, originalDescriptor);
      Object.defineProperty(nestedSchema, 'safeParse', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: (...args: Parameters<z.ZodType['safeParse']>) => {
          const [value] = args;
          /* v8 ignore next -- zod-to-openapi currently probes only null and undefined. */
          if (value !== null && value !== undefined) {
            return originalSafeParse(...args);
          }

          return zodSchemaAcceptsNullishValue(nestedSchema, value)
            ? { success: true, data: value }
            : { success: false, error: new z.ZodError([]) };
        },
      });
    }

    return generate();
  } finally {
    for (const [nestedSchema, descriptor] of originals) {
      Object.defineProperty(nestedSchema, 'safeParse', descriptor);
    }
  }
}

/** Options for {@link zodToOpenApiSchema}. */
export type ZodToOpenApiSchemaOptions = {
  /**
   * Internal registry id used while generating and resolving the inline schema.
   * This does not register a reusable schema in the final Nest OpenAPI document.
   */
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
  const registeredSchema = registry.register(refId, schema);
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const { components } = withSynchronousOpenApiIntrospection(
    registeredSchema,
    () => generator.generateComponents(),
  );
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
type ObjectWrapper =
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

function unwrapInputObjectSchema(schema: z.ZodType): z.ZodObject | undefined {
  switch (schema.def.type) {
    case 'object':
      return schema as z.ZodObject;
    case 'optional':
    case 'nullable':
    case 'default':
      return unwrapInputObjectSchema((schema as ObjectWrapper).unwrap());
    default:
      return undefined;
  }
}

/**
 * Returns the underlying object schema for input docs when the schema is a
 * `z.object(...)` wrapped by `optional`, `nullable`, or `default`.
 */
export function zodInputObjectSchema(
  schema: z.ZodType,
): z.ZodObject | undefined {
  return unwrapInputObjectSchema(zodSchemaForInput(schema));
}

/**
 * Returns the schema that represents the input wire format for OpenAPI docs.
 *
 * Top-level codecs / pipes use their input side. Nested codecs remain in their
 * original containers so their metadata and constraints are preserved;
 * `@asteasolutions/zod-to-openapi` reads their input side during conversion.
 */
export function zodSchemaForInput(schema: z.ZodType): z.ZodType {
  return unwrapInputSchema(schema);
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
