---
name: nest-zod-swagger
description: 'Guide Swagger-aware integration of nest-zod in NestJS codebases. Use when adding or updating Zod-backed request parsing, response serialization, and generated OpenAPI metadata with imports from `nest-zod/swagger`, especially in controllers that already use `@nestjs/swagger` or `SwaggerModule`.'
---

# Nest Zod Swagger

Use this skill to add or revise Swagger-aware `nest-zod` usage in a NestJS codebase.

Keep changes aligned with this library's Swagger contract:

- Import from `nest-zod/swagger`
- Preserve the same runtime parsing and serialization behavior as `nest-zod`
- Add OpenAPI metadata through the decorators instead of duplicating it manually
- Leave `SwaggerModule` bootstrap setup in the application bootstrap path, not in the decorators

## Workflow

1. Inspect the target controller, nearby schema files, and existing Swagger setup.
2. Confirm the codebase wants generated OpenAPI metadata from `nest-zod/swagger`.
3. Reuse existing Zod schemas when they already describe the contract. Add `refId` only when stable component naming will help generated docs stay clear.
4. Apply decorators in the smallest possible surface:
   - `@ZBody(schema, options?)`
   - `@ZParam(name, schema, options?)`
   - `@ZQuery(schema, options?)` for whole-query objects
   - `@ZQuery(name, schema, options?)` for named query parameters
   - `@ZSerialize(schema, options?)` for encoded responses and success-status docs
5. Keep DTO types derived from Zod and keep runtime and OpenAPI behavior driven by the same schema.
6. Preserve existing route logic, explicit `@HttpCode()` settings, and Swagger bootstrap wiring unless the task explicitly changes them.

## Rules

- Import from `nest-zod/swagger`, not `nest-zod`.
- Use `refId` when a schema should have a stable, readable OpenAPI component name.
- Respect `ZSerialize` status rules:
  - `200` by default
  - `201` for `@Post()` unless overridden
  - explicit `status` when passed to `ZSerialize`
- For whole-query object schemas, use `ZQuery(schema)`.
- For scalar or named object query params, use `ZQuery(name, schema)`.
- Do not imply that `nest-zod/swagger` bootstraps `SwaggerModule` for the app.

## Common Tasks

### Add Swagger-aware decorators to a controller

- Define or reuse Zod schemas for request and response shapes.
- Add `nest-zod/swagger` decorators instead of pairing runtime decorators with separate manual `ApiBody`, `ApiParam`, `ApiQuery`, or `ApiResponse` calls unless the task needs extra metadata beyond the decorator options.
- Add `refId` selectively for stable schema names in generated docs.

### Correct mixed or incomplete Swagger usage

- Replace incorrect root-entrypoint imports with `nest-zod/swagger`.
- Remove duplicated manual Swagger metadata when the `nest-zod/swagger` decorator already expresses the same contract.
- Keep explicit route status annotations intact and let `ZSerialize` document the effective success status.

### Add query documentation

- Use whole-query object form for object-shaped query strings.
- Use named form for scalar query params and named object query params.
- When nested named object queries are expected under Express, account for the extended query parser requirement.

## Checks

- Confirm imports come from `nest-zod/swagger`.
- Confirm `ZSerialize` status behavior matches the route definition.
- Confirm query decorator form matches the schema shape.
- Confirm the app still owns `SwaggerModule` bootstrap separately.
- Confirm any nested named object query example is compatible with the app's query parser setup.

Read [references/patterns.md](references/patterns.md) for canonical Swagger-aware controller patterns.
Read [references/pitfalls.md](references/pitfalls.md) when fixing wrong imports, wrong query forms, or response-status confusion.
