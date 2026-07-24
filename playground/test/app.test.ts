import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app';

describe('playground app', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serializes response data and exposes Swagger metadata', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/items')
      .send({ title: 'Demo item', quantity: '2' });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Demo item',
      quantity: 2,
      createdAt: '2024-01-01T12:00:00.000Z',
    });

    const docsResponse = await request(app.getHttpServer()).get('/docs-json');

    expect(docsResponse.status).toBe(200);
    expect(docsResponse.body.paths['/items'].post).toBeDefined();
    expect(
      docsResponse.body.paths['/items'].post.requestBody.content[
        'application/json'
      ],
    ).toBeDefined();
    expect(
      docsResponse.body.paths['/items'].post.responses['200'].content,
    ).toBeDefined();
  });

  it('supports the runtime-only decorators without Swagger metadata', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/plain-items')
      .send({ title: 'Plain demo item', quantity: '3' });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toMatchObject({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Plain demo item',
      quantity: 3,
      createdAt: '2024-04-04T14:45:00.000Z',
    });

    const getResponse = await request(app.getHttpServer()).get(
      '/plain-items/f47ac10b-58cc-4372-a567-0e02b2c3d479',
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');

    const docsResponse = await request(app.getHttpServer()).get('/docs-json');
    const plainPost = docsResponse.body.paths['/plain-items']?.post;
    expect(plainPost?.requestBody).toBeUndefined();
  });

  it('returns 400 for invalid params and 500 for serialization failures', async () => {
    const invalidParamResponse = await request(app.getHttpServer()).get(
      '/items/not-a-uuid',
    );
    expect(invalidParamResponse.status).toBe(400);

    const invalidPlainParamResponse = await request(app.getHttpServer()).get(
      '/plain-items/not-a-uuid',
    );
    expect(invalidPlainParamResponse.status).toBe(400);

    const serializationFailureResponse = await request(app.getHttpServer()).get(
      '/items/broken/serialization',
    );
    expect(serializationFailureResponse.status).toBe(500);
  });

  it('supports async validation and application-defined validation errors', async () => {
    const asyncValidResponse = await request(app.getHttpServer()).get(
      '/items/async/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(asyncValidResponse.status).toBe(200);
    expect(asyncValidResponse.body.id).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );

    const asyncInvalidResponse = await request(app.getHttpServer()).get(
      '/items/async/not-a-uuid',
    );
    expect(asyncInvalidResponse.status).toBe(400);

    const detailedErrorResponse = await request(app.getHttpServer())
      .post('/items/detailed-validation')
      .send({ title: '', quantity: 'nope' });
    expect(detailedErrorResponse.status).toBe(400);
    expect(detailedErrorResponse.body).toMatchObject({
      message: 'Invalid item payload',
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ['title'] }),
        expect.objectContaining({ path: ['quantity'] }),
      ]),
    });
  });

  it('supports named object query decorators in Swagger and at runtime', async () => {
    const queryResponse = await request(app.getHttpServer()).get(
      '/items/named-query?filter[q]=widget',
    );

    expect(queryResponse.status).toBe(200);
    expect(queryResponse.body).toEqual({ q: 'widget' });

    const docsResponse = await request(app.getHttpServer()).get('/docs-json');
    const parameters = docsResponse.body.paths['/items/named-query'].get
      .parameters as Array<Record<string, unknown>> | undefined;

    expect(parameters).toHaveLength(1);
    expect(parameters?.[0]).toMatchObject({
      in: 'query',
      name: 'filter',
      schema: {
        type: 'object',
        properties: { q: { type: 'string' } },
      },
    });
  });
});
