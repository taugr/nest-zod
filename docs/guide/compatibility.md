# Compatibility and Limits

## Supported Versions

`nest-zod` requires Node.js 22 or newer and Zod 4.

The supported Nest combinations are:

| NestJS | `@nestjs/swagger` |
| ------ | ----------------- |
| 10     | 8                 |
| 11     | 11                |

`@nestjs/swagger` is optional. Install it only when importing from
`nest-zod/swagger`.

The package CI checks both supported combinations from a packed tarball. It also
loads the package from ESM and CommonJS and type-checks a clean consumer.

## Synchronous and Asynchronous Schemas

Parsing and encoding are synchronous by default. This preserves the direct
return behavior of `ZValidationPipe.transform()` and the existing serializer
interceptor.

Enable async parsing when a request schema contains an asynchronous refinement,
transform, or codec:

```ts
const accountIdSchema = z.string().refine(
  async (id) => accountRepository.exists(id),
  'Unknown account',
);

@Get(':accountId')
getAccount(
  @ZParam('accountId', accountIdSchema, {
    validation: { async: true },
  })
  accountId: string,
) {
  return { accountId };
}
```

Enable async response encoding separately:

```ts
@ZSerialize(responseSchema, {
  serialization: { async: true },
})
```

These runtime options work with both `nest-zod` and `nest-zod/swagger`.

## Validation Error Responses

The default validation response remains deliberately small:

```json
{
  "message": "Validation failed",
  "statusCode": 400
}
```

The original `ZodError` is available as the exception `cause`. Applications
that intentionally expose field issues can provide an exception factory:

```ts
@ZBody(createItemSchema, {
  validation: {
    exceptionFactory: (error) =>
      new BadRequestException({
        message: 'Invalid item payload',
        issues: error.issues,
      }),
  },
})
body: CreateItemDto
```

Review the resulting error envelope for sensitive values before exposing it
from a public API.

## OpenAPI Schema Generation

The Swagger decorators emit inline schemas. The `refId` option is an internal
registry identifier used while generating and resolving an inline schema. It
does not add a reusable entry to the final document's `components.schemas`.

OpenAPI metadata generation never runs refinements, transforms, preprocessors,
or codecs to determine whether a schema accepts `null` or `undefined`. This
keeps opt-in async schemas safe during application startup. Required and
nullable metadata follows the schema's structural input shape; conditions that
exist only inside a custom refinement cannot be represented in OpenAPI.

Recursive component references are not supported because inline expansion
cannot represent a recursive graph. Use explicit `@nestjs/swagger` models for
recursive API shapes.

Zod codecs are documented using their input side because that is the request
wire format and the value produced by `schema.encode()` for responses.

## Query Parsing

`ZQuery(schema)` represents the whole query object.
`ZQuery('name', schema)` represents one named query value.

Nested query values such as `?filter[q]=widget` depend on the HTTP adapter's
query parser. The Express adapter usually needs its extended query parser:

```ts
app.getHttpAdapter().getInstance().set('query parser', 'extended');
```

Other adapters may require different configuration.

## Response Status

The `status` option on Swagger-aware `ZSerialize` controls OpenAPI metadata; it
does not change the runtime HTTP status. Use Nest's `@HttpCode()` when runtime
behavior must change.

Without an explicit Swagger status, `ZSerialize` documents:

- the route's `@HttpCode()` value
- otherwise `201` for `POST`
- otherwise `200`
