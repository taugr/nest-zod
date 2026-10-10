import 'reflect-metadata';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// swagger-client is CommonJS and does not ship TypeScript declarations.
const client = createRequire(import.meta.url)('swagger-client') as {
  buildRequest(options: {
    spec: OpenAPIObject;
    operationId: string;
    parameters: Record<string, unknown>;
    baseURL: string;
  }): { url: string };
};

describe('playground query wire contracts', () => {
  let app: INestApplication;
  let document: OpenAPIObject;
  let origin: string;

  beforeAll(async () => {
    app = await createApp({ logger: false });
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    origin = `http://127.0.0.1:${address.port}`;
    const response = await request(app.getHttpServer()).get('/docs-json');
    expect(response.status).toBe(200);
    document = response.body as OpenAPIObject;
  });

  afterAll(async () => {
    await app.close();
  });

  function serialize(
    pathName: string,
    parameters: Record<string, unknown>,
    spec = document,
  ) {
    // Pure in-memory serialization: no spec URL, reference resolver or remote transport.
    const operationId = spec.paths[pathName].get!.operationId!;
    const { url } = client.buildRequest({
      spec,
      operationId,
      parameters,
      baseURL: origin,
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe(origin);
    return parsed.pathname + parsed.search;
  }

  it('serializes the generated named object query into the value expected by the handler', async () => {
    const path = serialize('/items/named-query', { filter: { q: 'widget' } });
    expect(path).toBe('/items/named-query?filter%5Bq%5D=widget');
    const response = await request(app.getHttpServer()).get(path);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ q: 'widget' });
  });

  it('retains the manual bracket control', async () => {
    const response = await request(app.getHttpServer()).get(
      '/items/named-query?filter[q]=widget',
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ q: 'widget' });
  });

  it('keeps the named object required in both the client and HTTP route', async () => {
    expect(() => serialize('/items/named-query', {})).toThrow(
      'Required parameter filter is not provided',
    );
    const response = await request(app.getHttpServer()).get(
      '/items/named-query',
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  it('reproduces the failure when serialization metadata is removed from a copied document', async () => {
    const copy = structuredClone(document);
    const parameter = copy.paths['/items/named-query'].get!.parameters![0];
    if (!('name' in parameter))
      throw new Error('Expected inline query parameter');
    delete parameter.style;
    delete parameter.explode;
    const path = serialize(
      '/items/named-query',
      { filter: { q: 'widget' } },
      copy,
    );
    expect(path).toBe('/items/named-query?q=widget');
    const response = await request(app.getHttpServer()).get(path);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');

    // The captured document stays fixed and still produces the successful contract.
    const originalPath = serialize('/items/named-query', {
      filter: { q: 'widget' },
    });
    const originalResponse = await request(app.getHttpServer()).get(
      originalPath,
    );
    expect(originalResponse.status).toBe(200);
    expect(originalResponse.body).toEqual({ q: 'widget' });
  });

  it.each([
    ['omitted', {}, false, 'Widget'],
    ['false', { includeArchived: false }, false, 'Widget'],
    ['true', { includeArchived: true }, true, 'Archived Widget'],
  ] as const)(
    'parses includeArchived %s from client-serialized HTTP input',
    async (_name, parameters, expected, title) => {
      const path = serialize('/items', parameters);
      const response = await request(app.getHttpServer()).get(path);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        page: 1,
        includeArchived: expected,
        items: [{ title }],
      });
    },
  );

  it.each(['yes', 'no', '1', '0', 'TRUE', 'FALSE', '', 'widget'])(
    'rejects invalid includeArchived=%s with HTTP 400',
    async (value) => {
      const response = await request(app.getHttpServer()).get(
        '/items?includeArchived=' + encodeURIComponent(value),
      );
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Validation failed',
        error: 'Bad Request',
        statusCode: 400,
      });
    },
  );

  it.each([
    '/items?includeArchived=true&includeArchived=false',
    '/items?includeArchived[value]=false',
  ])('rejects non-scalar boolean query input at %s', async (path) => {
    const response = await request(app.getHttpServer()).get(path);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  it('documents the accepted boolean wire strings and keeps whole-query fields scalar', () => {
    const parameters = document.paths['/items'].get!.parameters!;
    const archived = parameters.find(
      (parameter) =>
        'name' in parameter && parameter.name === 'includeArchived',
    );
    expect(archived).toMatchObject({
      in: 'query',
      name: 'includeArchived',
      required: false,
      schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
    });
    for (const parameter of parameters) {
      expect(parameter).not.toHaveProperty('style');
      expect(parameter).not.toHaveProperty('explode');
    }
    expect(serialize('/items', { page: 2, includeArchived: false })).toBe(
      '/items?page=2&includeArchived=false',
    );
  });
});
