# API Reference

## Entry Points

`nest-zod` exports runtime parsing and serialization:

```ts
import {
  ZBody,
  ZParam,
  ZQuery,
  ZSerialize,
  ZSerializerInterceptor,
  ZValidationPipe,
} from 'nest-zod';
```

`nest-zod/swagger` exports Swagger-aware versions of the four decorators plus
the OpenAPI helpers:

```ts
import {
  ZBody,
  ZParam,
  ZQuery,
  ZSerialize,
  isZodObjectSchema,
  zodInputObjectSchema,
  zodSchemaForEncodedResponse,
  zodSchemaForInput,
  zodToOpenApiSchema,
} from 'nest-zod/swagger';
```

## Request Decorators

### `ZBody(schema, options?)`

Parses the whole request body.

### `ZParam(name, schema, options?)`

Parses one named route parameter.

### `ZQuery(schema, options?)`

Parses the whole query object.

### `ZQuery(name, schema, options?)`

Parses one named query parameter. The named value may be scalar or
object-shaped.

All request decorators accept runtime validation options:

```ts
type ZValidationDecoratorOptions = {
  validation?: {
    async?: boolean;
    exceptionFactory?: (error: z.ZodError) => Error;
  };
};
```

`async` selects `schema.parseAsync()` instead of `schema.parse()`.
`exceptionFactory` replaces the default `BadRequestException` for Zod failures.

Swagger-aware `ZBody` and `ZParam` also forward their corresponding
`@nestjs/swagger` options. Swagger-aware `ZQuery` adds `refId` but otherwise
keeps the runtime option shape.

## Response Decorator

### `ZSerialize(schema, options?)`

Encodes each successful handler result before Nest sends it.

Runtime-only options:

```ts
type ZSerializeOptions = {
  serialization?: {
    async?: boolean;
  };
};
```

Enable `serialization.async` when the response schema requires
`schema.encodeAsync()`.

The Swagger-aware version also accepts `ApiResponseOptions` fields except
`schema`, plus:

```ts
type ZSerializeOptions = {
  refId?: string;
  serialization?: {
    async?: boolean;
  };
};
```

Its `status` field controls the documented response status. Use Nest's
`@HttpCode()` to change the runtime HTTP status.

## Runtime Classes

### `ZValidationPipe`

```ts
new ZValidationPipe(schema, {
  async?: boolean,
  exceptionFactory?: (error) => exception,
});
```

Synchronous mode returns the schema output directly. Async mode returns a
promise. Non-Zod errors thrown by schema logic are rethrown unchanged.
When the class's `TAsync` generic is explicitly `true`, the constructor also
requires `{ async: true }`, keeping the declared promise return type aligned
with runtime behavior.

### `ZSerializerInterceptor`

```ts
new ZSerializerInterceptor(schema, {
  async?: boolean,
});
```

Encoding errors become `InternalServerErrorException` with message
`Serialization failed`; the original error is available as `cause`.

## OpenAPI Helpers

### `zodToOpenApiSchema(schema, options?)`

Converts a Zod schema into an inline OpenAPI 3.0 schema.

`options.refId` is the internal id used by the temporary schema registry. It
does not register a reusable component in the final Nest document.

### `zodSchemaForInput(schema)`

Returns the schema used to describe the incoming wire format. A top-level Zod
codec uses its input side.

### `zodSchemaForEncodedResponse(schema)`

Returns the schema used to describe the encoded response wire format. This is
also the codec input side because that is what `schema.encode()` emits.

### `zodInputObjectSchema(schema)`

Returns the underlying input object for whole-query documentation when the
schema is an object or an object wrapped in `optional`, `nullable`, or
`default`. Otherwise it returns `undefined`.

### `isZodObjectSchema(schema)`

Narrows schemas accepted as whole-query objects. It uses
`zodInputObjectSchema()` internally.

## Default Errors

Invalid input produces:

```json
{
  "message": "Validation failed",
  "statusCode": 400
}
```

Encoding failures produce:

```json
{
  "message": "Serialization failed",
  "statusCode": 500
}
```

See [Compatibility and Limits](/guide/compatibility) for async schemas,
custom error envelopes, query parsing, recursive schemas, and supported peer
versions.
