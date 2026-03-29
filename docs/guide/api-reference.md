# API Reference

## Runtime Decorators

### `ZBody(schema)`

Validates and parses the request body with `schema.parse`.

```ts
@Post()
create(@ZBody(createItemSchema) body: CreateItemDto) {
  return body;
}
```

### `ZParam(name, schema)`

Validates and parses a named route param.

```ts
@Get(':id')
get(@ZParam('id', z.uuid()) id: string) {
  return { id };
}
```

### `ZQuery(schema)`

Validates and parses the whole query payload. This is especially useful with `z.coerce.*()` and defaults.

```ts
@Get()
list(@ZQuery(z.object({
  page: z.coerce.number().int().positive().default(1),
})) query: { page: number }) {
  return query;
}
```

### `ZQuery(name, schema)`

Validates and parses a named query parameter. The schema can be scalar or object-shaped.

```ts
@Get('search')
search(@ZQuery('q', z.string().trim().min(1)) q: string) {
  return { q };
}
```

```ts
@Get('named-query')
search(@ZQuery('filter', z.object({ q: z.string().min(1) })) filter: { q: string }) {
  return filter;
}
```

### `ZSerialize(schema)`

Applies the serializer interceptor and encodes the returned value with the provided schema before Nest sends the response.

No separate Nest registration is required. `ZSerialize` attaches the interceptor for that route directly.

```ts
@Get(':id')
@ZSerialize(itemResponseSchema)
get() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Widget',
  };
}
```

## Swagger Decorators

The `nest-zod/swagger` entrypoint exports the same decorator names with added OpenAPI metadata support:

- `ZBody(schema, options?)`
- `ZParam(name, schema, options?)`
- `ZQuery(schema, options?)`
- `ZQuery(name, schema, options?)`
- `ZSerialize(schema, options?)`

The optional `refId` is useful when you want stable component schema names in generated docs.

For `nest-zod/swagger`, use `ZQuery(name, schema, options?)` whenever the incoming value is a named query parameter, including object-shaped values such as `filter[q]=widget`.

## Swagger Helper Exports

### `zodToOpenApiSchema(schema, options?)`

Converts a Zod schema into an OpenAPI-compatible schema object.

### `zodSchemaForEncodedResponse(schema)`

Returns the response schema shape that should be documented for encoded output.

This matters for codec-like schemas where the wire format is different from the runtime value.

### `isZodObjectSchema(schema)`

Utility to detect whether a schema is a Zod object. The Swagger `ZQuery` decorator uses this to emit one query parameter entry per object property.

## Errors

### Validation failures

Invalid input results in a Nest `BadRequestException` with message:

```txt
Validation failed
```

### Serialization failures

Encoding failures result in a Nest `InternalServerErrorException` with message:

```txt
Serialization failed
```
