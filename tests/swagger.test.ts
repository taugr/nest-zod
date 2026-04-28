import 'reflect-metadata';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { HttpCode, Post } from '@nestjs/common';
import { vi } from 'vitest';
import { z } from 'zod';
import { isoDatetimeToDate } from './codecs';
import {
  isZodObjectSchema,
  zodInputObjectSchema,
  zodSchemaForInput,
  zodSchemaForEncodedResponse,
  zodToOpenApiSchema,
} from '../src/openapi-schema';
import { ZBody, ZParam, ZQuery, ZSerialize } from '../src/swagger';

const API_PARAMETERS = 'swagger/apiParameters';
const API_RESPONSE = 'swagger/apiResponse';

describe('zodToOpenApiSchema', () => {
  it('generates an object schema from z.object', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const openApi = zodToOpenApiSchema(schema, { refId: 'TestBody' });
    expect(openApi.type).toBe('object');
    expect(openApi.properties).toMatchObject({
      name: { type: 'string' },
      age: { type: 'number' },
    });
    expect(openApi.required).toEqual(expect.arrayContaining(['name', 'age']));
  });

  it('uses a stable refId when provided', () => {
    const schema = z.string();
    const a = zodToOpenApiSchema(schema, { refId: 'StableRef' });
    const b = zodToOpenApiSchema(schema, { refId: 'StableRef' });
    expect(a).toEqual(b);
  });

  it('inlines referenced component schemas into the returned schema object', () => {
    const child = z.object({ id: z.string() }).meta({ id: 'Child' });
    const schema = z.object({ child });

    expect(zodToOpenApiSchema(schema, { refId: 'Parent' })).toMatchObject({
      type: 'object',
      properties: {
        child: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
      },
    });
  });

  it('throws when the generator returns no matching schema', () => {
    const spy = vi
      .spyOn(OpenApiGeneratorV3.prototype, 'generateComponents')
      .mockReturnValue({ components: { schemas: {} } });
    try {
      expect(() =>
        zodToOpenApiSchema(z.string(), { refId: 'missing' }),
      ).toThrow(/failed to generate OpenAPI schema/);
    } finally {
      spy.mockRestore();
    }
  });

  it('throws when a generated $ref cannot be resolved', () => {
    const spy = vi
      .spyOn(OpenApiGeneratorV3.prototype, 'generateComponents')
      .mockReturnValue({
        components: {
          schemas: {
            BrokenRef: {
              type: 'object',
              properties: {
                child: { $ref: '#/components/schemas/MissingChild' },
              },
            },
          },
        },
      });

    try {
      expect(() =>
        zodToOpenApiSchema(z.string(), { refId: 'BrokenRef' }),
      ).toThrow(/failed to resolve OpenAPI component schema/);
    } finally {
      spy.mockRestore();
    }
  });

  it('throws when generated component refs are recursive', () => {
    const spy = vi
      .spyOn(OpenApiGeneratorV3.prototype, 'generateComponents')
      .mockReturnValue({
        components: {
          schemas: {
            RecursiveRef: { $ref: '#/components/schemas/Loop' },
            Loop: { $ref: '#/components/schemas/Loop' },
          },
        },
      });

    try {
      expect(() =>
        zodToOpenApiSchema(z.string(), { refId: 'RecursiveRef' }),
      ).toThrow(/recursive OpenAPI component refs are not supported/);
    } finally {
      spy.mockRestore();
    }
  });

  it('preserves sibling properties when inlining a referenced schema', () => {
    const spy = vi
      .spyOn(OpenApiGeneratorV3.prototype, 'generateComponents')
      .mockReturnValue({
        components: {
          schemas: {
            WithSiblingRef: {
              type: 'object',
              properties: {
                child: {
                  $ref: '#/components/schemas/Child',
                  description: 'Child payload',
                },
              },
            },
            Child: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        },
      });

    try {
      expect(
        zodToOpenApiSchema(z.string(), { refId: 'WithSiblingRef' }),
      ).toMatchObject({
        type: 'object',
        properties: {
          child: {
            allOf: [
              {
                type: 'object',
                properties: { id: { type: 'string' } },
              },
            ],
            description: 'Child payload',
          },
        },
      });
    } finally {
      spy.mockRestore();
    }
  });

  it('passes through non-object component payloads from mocked generator output', () => {
    const spy = vi
      .spyOn(OpenApiGeneratorV3.prototype, 'generateComponents')
      .mockReturnValue({
        components: {
          schemas: {
            PrimitiveRef: { $ref: '#/components/schemas/ScalarValue' },
            ScalarValue: 'string',
          },
        },
      } as unknown as ReturnType<OpenApiGeneratorV3['generateComponents']>);

    try {
      expect(zodToOpenApiSchema(z.string(), { refId: 'PrimitiveRef' })).toBe(
        'string',
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('generates a schema when refId is omitted', () => {
    expect(zodToOpenApiSchema(z.string())).toMatchObject({ type: 'string' });
  });

  it('handles schemas lookup becoming unavailable after the root schema is read', () => {
    let readCount = 0;
    const spy = vi
      .spyOn(OpenApiGeneratorV3.prototype, 'generateComponents')
      .mockReturnValue({
        components: {
          get schemas() {
            readCount += 1;
            if (readCount === 1) {
              return {
                FlakySchemas: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                  },
                },
              };
            }

            return undefined;
          },
        },
      } as unknown as ReturnType<OpenApiGeneratorV3['generateComponents']>);

    try {
      expect(
        zodToOpenApiSchema(z.string(), { refId: 'FlakySchemas' }),
      ).toMatchObject({
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      });
    } finally {
      spy.mockRestore();
    }
  });
});

describe('zodSchemaForEncodedResponse', () => {
  it('returns the pipe in-schema for codecs', () => {
    const s = z.object({ at: isoDatetimeToDate });
    const wire = zodSchemaForEncodedResponse(s.shape.at);
    expect(wire).toBe(isoDatetimeToDate.def.in);
  });

  it('returns the schema unchanged when not a pipe', () => {
    const s = z.object({ x: z.number() });
    expect(
      zodToOpenApiSchema(zodSchemaForEncodedResponse(s), {
        refId: 'PlainResponse',
      }),
    ).toMatchObject({
      type: 'object',
      properties: { x: { type: 'number' } },
    });
  });

  it('rewrites nested codec fields to their encoded wire types', () => {
    const s = z.object({
      id: z.uuid(),
      count: z.number(),
      at: isoDatetimeToDate,
    });

    const wire = zodSchemaForEncodedResponse(s);
    const openApi = zodToOpenApiSchema(wire, {
      refId: 'EncodedNestedResponse',
    });

    expect(openApi).toMatchObject({
      type: 'object',
      properties: {
        id: { type: 'string' },
        count: { type: 'number' },
        at: { type: 'string' },
      },
    });
  });
});

describe('zodSchemaForInput', () => {
  it('rewrites nested codec fields to their input wire types', () => {
    const s = z.object({
      page: z.number(),
      at: isoDatetimeToDate.optional(),
    });

    const wire = zodSchemaForInput(s);
    const openApi = zodToOpenApiSchema(wire, { refId: 'InputNestedQuery' });

    expect(openApi).toMatchObject({
      type: 'object',
      properties: {
        page: { type: 'number' },
        at: { type: 'string' },
      },
    });
  });

  it('preserves nullable wrappers around rewritten schemas', () => {
    const openApi = zodToOpenApiSchema(
      zodSchemaForInput(isoDatetimeToDate.nullable()),
      { refId: 'NullableInputCodec' },
    );

    expect(openApi).toMatchObject({
      type: 'string',
      nullable: true,
    });
  });

  it('rewrites array and union children recursively', () => {
    const schema = z.union([
      z.array(isoDatetimeToDate),
      z.object({
        ids: z.array(
          z.codec(z.string(), z.number(), {
            decode: Number,
            encode: String,
          }),
        ),
      }),
    ]);

    const openApi = zodToOpenApiSchema(zodSchemaForInput(schema), {
      refId: 'ArrayAndUnionInput',
    });

    expect(openApi).toMatchObject({
      anyOf: [
        {
          type: 'array',
          items: { type: 'string' },
        },
        {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      ],
    });
  });

  it('preserves strict, loose, and typed catchall object modes', () => {
    const strictOpenApi = zodToOpenApiSchema(
      zodSchemaForInput(z.strictObject({ id: isoDatetimeToDate })),
      { refId: 'StrictObjectInput' },
    );
    const looseOpenApi = zodToOpenApiSchema(
      zodSchemaForInput(z.looseObject({ id: isoDatetimeToDate })),
      { refId: 'LooseObjectInput' },
    );
    const typedCatchallOpenApi = zodToOpenApiSchema(
      zodSchemaForInput(
        z.object({ id: isoDatetimeToDate }).catchall(z.number()),
      ),
      { refId: 'TypedCatchallInput' },
    );

    expect(strictOpenApi).toMatchObject({
      type: 'object',
      properties: { id: { type: 'string' } },
      additionalProperties: false,
    });
    expect(looseOpenApi).toMatchObject({
      type: 'object',
      properties: { id: { type: 'string' } },
      additionalProperties: {},
    });
    expect(typedCatchallOpenApi).toMatchObject({
      type: 'object',
      properties: { id: { type: 'string' } },
      additionalProperties: { type: 'number' },
    });
  });

  it('unwraps optional object schemas for query metadata generation', () => {
    const schema = z.object({ q: z.string() }).optional();

    expect(zodInputObjectSchema(schema)?.shape).toHaveProperty('q');
  });
});

describe('isZodObjectSchema', () => {
  it('is true for z.object', () => {
    const s = z.object({ a: z.string() });
    expect(isZodObjectSchema(s)).toBe(true);
  });

  it('is false for z.string', () => {
    expect(isZodObjectSchema(z.string())).toBe(false);
  });

  it('is true for wrapped objects used as whole-query schemas', () => {
    expect(
      isZodObjectSchema(z.object({ q: z.string() }).default({ q: 'x' })),
    ).toBe(true);
  });
});

describe('zodInputObjectSchema', () => {
  it('unwraps wrapped object schemas for query metadata generation', () => {
    const schema = z
      .object({
        page: z.coerce.number().default(1),
        q: z.string().optional(),
      })
      .default({ page: 1, q: undefined });

    expect(zodInputObjectSchema(schema)?.shape).toHaveProperty('page');
    expect(zodInputObjectSchema(schema)?.shape).toHaveProperty('q');
  });
});

describe('swagger ZBody', () => {
  it('registers Swagger body metadata with a Zod-derived schema', () => {
    const bodySchema = z.object({ title: z.string() });

    class Controller {
      create(
        @ZBody(bodySchema, { description: 'Payload', refId: 'CreateBody' })
        _body: unknown,
      ) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'create',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const bodyParam = params.find((p) => p['in'] === 'body' && p['schema']);
    expect(bodyParam).toBeDefined();
    expect(bodyParam!['schema']).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string' } },
    });
    expect(bodyParam!['description']).toBe('Payload');
  });

  it('skips ApiBody when the method descriptor is missing', () => {
    const spy = vi
      .spyOn(Object, 'getOwnPropertyDescriptor')
      .mockReturnValue(undefined);
    try {
      const dec = ZBody(z.object({ x: z.number() }));
      class X {}
      expect(() => dec(X.prototype, 'bare', 0)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('works without ApiBody options (only Zod validation + schema)', () => {
    const bodySchema = z.object({ x: z.number() });

    class Controller {
      bare(@ZBody(bodySchema) _body: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'bare',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const bodyParam = params.find((p) => p['in'] === 'body' && p['schema']);
    expect(bodyParam).toBeDefined();
  });
});

describe('swagger ZParam', () => {
  it('registers path parameter Swagger metadata', () => {
    const idSchema = z.uuid();

    class Controller {
      getOne(@ZParam('id', idSchema) _id: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'getOne',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const pathParam = params.find(
      (p) => p['in'] === 'path' && p['name'] === 'id',
    );
    expect(pathParam).toBeDefined();
    expect(pathParam!['schema']).toBeDefined();
  });

  it('skips ApiParam when the method descriptor is missing', () => {
    const spy = vi
      .spyOn(Object, 'getOwnPropertyDescriptor')
      .mockReturnValue(undefined);
    try {
      const dec = ZParam('slug', z.string());
      class X {}
      expect(() => dec(X.prototype, 'bySlug', 0)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('works without extra ApiParam options', () => {
    class Controller {
      bySlug(@ZParam('slug', z.string()) _slug: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'bySlug',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    expect(params.some((p) => p['in'] === 'path' && p['name'] === 'slug')).toBe(
      true,
    );
  });
});

describe('swagger ZQuery', () => {
  it('emits one ApiQuery per object property', () => {
    const q = z.object({
      page: z.coerce.number(),
      q: z.string().optional(),
    });

    class Controller {
      search(@ZQuery(q, { refId: 'SearchQuery' }) _query: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'search',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const queries = params.filter((p) => p['in'] === 'query');
    expect(queries.length).toBeGreaterThanOrEqual(2);
    expect(queries.some((p) => p['name'] === 'page')).toBe(true);
    expect(queries.some((p) => p['name'] === 'q')).toBe(true);
    expect(queries.find((p) => p['name'] === 'page')?.['required']).toBe(true);
    expect(queries.find((p) => p['name'] === 'q')?.['required']).toBe(false);
  });

  it('supports wrapped whole-query object schemas', () => {
    const q = z
      .object({
        page: z.coerce.number().default(1),
        q: z.string().optional(),
      })
      .default({ page: 1, q: undefined });

    class Controller {
      search(@ZQuery(q, { refId: 'WrappedSearchQuery' }) _query: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'search',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const queries = params.filter((p) => p['in'] === 'query');
    expect(queries).toHaveLength(2);
    expect(queries.find((p) => p['name'] === 'page')?.['required']).toBe(false);
    expect(queries.find((p) => p['name'] === 'q')?.['required']).toBe(false);
    expect(queries.find((p) => p['name'] === 'page')?.['schema']).toMatchObject(
      {
        type: 'number',
      },
    );
  });

  it('documents named object schemas as a single query parameter', () => {
    class Controller {
      search(@ZQuery('filter', z.object({ q: z.string() })) _query: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'search',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const queries = params.filter((p) => p['in'] === 'query' && p['schema']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({
      name: 'filter',
      schema: {
        type: 'object',
        properties: { q: { type: 'string' } },
      },
    });
  });

  it('emits a single named ApiQuery for a scalar schema', () => {
    class Controller {
      raw(@ZQuery('q', z.string()) _q: unknown) {
        return {};
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'raw',
    )!;
    const params = Reflect.getMetadata(
      API_PARAMETERS,
      descriptor.value,
    ) as Record<string, unknown>[];

    const queries = params.filter((p) => p['in'] === 'query' && p['schema']);
    expect(queries).toHaveLength(1);
    expect(queries[0]['name']).toBe('q');
  });

  it('throws for scalar schemas without a query parameter name', () => {
    const dec = ZQuery(z.string());
    class X {
      missing() {
        return {};
      }
    }

    expect(() => dec(X.prototype, 'missing', 0)).toThrow(
      /scalar ZQuery schemas require a query parameter name/,
    );
  });

  it('no-ops Swagger metadata when the method descriptor is missing', () => {
    const spy = vi
      .spyOn(Object, 'getOwnPropertyDescriptor')
      .mockReturnValue(undefined);
    try {
      const dec = ZQuery(z.string());
      class X {}
      expect(() => dec(X.prototype, 'missing', 0)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('swagger ZSerialize', () => {
  it('registers 200 response schema from Zod', async () => {
    const responseSchema = z.object({ ok: z.boolean() });

    class Controller {
      @ZSerialize(responseSchema, {
        description: 'Done',
        refId: 'GetResponse',
      })
      get() {
        return { ok: true };
      }
    }

    await Promise.resolve();

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'get',
    )!;
    const responses = Reflect.getMetadata(
      API_RESPONSE,
      descriptor.value,
    ) as Record<string, { schema?: unknown; description?: string }>;

    expect(responses['200']).toBeDefined();
    expect(responses['200'].description).toBe('Done');
    expect(responses['200'].schema).toMatchObject({
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    });
  });

  it('documents nested codecs using their encoded wire types', async () => {
    const responseSchema = z.object({
      ok: z.boolean(),
      createdAt: isoDatetimeToDate,
    });

    class Controller {
      @ZSerialize(responseSchema, { refId: 'NestedCodecResponse' })
      get() {
        return { ok: true, createdAt: new Date('2024-01-01T00:00:00.000Z') };
      }
    }

    await Promise.resolve();

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'get',
    )!;
    const responses = Reflect.getMetadata(
      API_RESPONSE,
      descriptor.value,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;

    expect(responses['200']?.schema).toMatchObject({
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        createdAt: { type: 'string' },
      },
    });
  });

  it('infers 201 for Post handlers by default', async () => {
    const responseSchema = z.object({ id: z.string() });

    class Controller {
      @ZSerialize(responseSchema, { refId: 'CreateResponse' })
      @Post()
      create() {
        return { id: '1' };
      }
    }

    await Promise.resolve();

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'create',
    )!;
    const responses = Reflect.getMetadata(
      API_RESPONSE,
      descriptor.value,
    ) as Record<string, { schema?: unknown }>;

    expect(responses['201']?.schema).toMatchObject({
      type: 'object',
      properties: { id: { type: 'string' } },
    });
    expect(responses['200']).toBeUndefined();
  });

  it('works without response options', async () => {
    const responseSchema = z.object({ n: z.number() });

    class Controller {
      @ZSerialize(responseSchema)
      getBare() {
        return { n: 1 };
      }
    }

    await Promise.resolve();

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'getBare',
    )!;
    const responses = Reflect.getMetadata(
      API_RESPONSE,
      descriptor.value,
    ) as Record<string, { schema?: unknown }>;

    expect(responses['200']?.schema).toMatchObject({
      type: 'object',
      properties: { n: { type: 'number' } },
    });
  });

  it('honors an explicit HttpCode status when no Swagger status is provided', async () => {
    const responseSchema = z.object({ ok: z.boolean() });

    class Controller {
      @HttpCode(204)
      @ZSerialize(responseSchema, { refId: 'NoContentResponse' })
      getNoContent() {
        return { ok: true };
      }
    }

    await Promise.resolve();

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'getNoContent',
    )!;
    const responses = Reflect.getMetadata(
      API_RESPONSE,
      descriptor.value,
    ) as Record<string, { schema?: unknown }>;

    expect(responses['204']?.schema).toMatchObject({
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    });
    expect(responses['200']).toBeUndefined();
  });

  it('applies an explicit Swagger status immediately', () => {
    const responseSchema = z.object({ ok: z.boolean() });

    class Controller {
      @ZSerialize(responseSchema, {
        description: 'Accepted',
        refId: 'AcceptedResponse',
        status: 202,
      })
      accepted() {
        return { ok: true };
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'accepted',
    )!;
    const responses = Reflect.getMetadata(
      API_RESPONSE,
      descriptor.value,
    ) as Record<string, { schema?: unknown; description?: string }>;

    expect(responses['202']).toBeDefined();
    expect(responses['202'].description).toBe('Accepted');
    expect(responses['202'].schema).toMatchObject({
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    });
  });
});
