---
name: nest-zod-runtime
description: "Guide runtime-only integration of nest-zod in NestJS codebases. Use when adding or updating Zod-backed request parsing and response serialization with imports from `nest-zod`, especially in controllers, schemas, and handler return paths that should not include Swagger/OpenAPI metadata."
---

# Nest Zod Runtime

Use this skill to add or revise runtime-only `nest-zod` usage in a NestJS codebase.

Keep changes aligned with this library's runtime contract:

- Import from `nest-zod`, never `nest-zod/swagger`
- Use `ZBody`, `ZParam`, `ZQuery`, and `ZSerialize`
- Keep schemas and inferred DTO types close to the controller they support
- Do not introduce global Nest pipe or interceptor registration for `nest-zod`

## Workflow

1. Inspect the target controller, nearby schema files, and current imports.
2. Confirm the codebase wants runtime-only behavior and is not expecting generated Swagger metadata from these decorators.
3. Reuse existing Zod schemas when they already express the required shape. Add new schemas only when the controller contract is missing one.
4. Apply decorators in the smallest possible surface:
   - `@ZBody(schema)` for request bodies
   - `@ZParam(name, schema)` for route params
   - `@ZQuery(schema)` for whole-query objects
   - `@ZQuery(name, schema)` for a named query parameter
   - `@ZSerialize(schema)` for handler return values
5. Keep handler parameter and return types derived from Zod with `z.infer<typeof schema>` or an exported alias.
6. Preserve existing Nest route structure and business logic unless the task explicitly changes them.

## Rules

- Prefer colocated `*.schemas.ts` files or the nearest existing schema module.
- Treat `ZSerialize` as the response contract. The handler should return data that can be encoded by the schema.
- For query objects, prefer coercion and defaults in the Zod schema instead of ad hoc parsing inside the handler.
- For named query parameters, use `ZQuery(name, schema)` even when the value is object-shaped.
- Keep imports explicit and avoid mixing runtime and Swagger entrypoints in the same edit.
- When updating existing code, remove only the wrong `nest-zod` usage that directly conflicts with the desired runtime-only path.

## Common Tasks

### Add runtime validation to a new controller

- Define or reuse Zod schemas for body, params, query, and response.
- Export DTO aliases from those schemas if the codebase uses named types.
- Add `nest-zod` decorators directly on controller parameters and methods.

### Convert an existing controller to runtime-only `nest-zod`

- Replace manual parsing or ad hoc Nest pipes only where the task expects `nest-zod`.
- Swap any incorrect `nest-zod/swagger` imports to `nest-zod`.
- Keep the same route behavior and status codes unless the task says otherwise.

### Extend an existing route

- Update the nearest schema first.
- Then update the decorated parameter or `@ZSerialize` schema so the runtime contract stays synchronized.

## Checks

- Confirm imports come only from `nest-zod`.
- Confirm no global `APP_PIPE`, `APP_INTERCEPTOR`, or `useGlobalInterceptors()` changes were added for `nest-zod`.
- Confirm whole-query versus named-query usage matches the schema shape.
- Confirm response values satisfy the `@ZSerialize` schema.

Read [references/patterns.md](references/patterns.md) for canonical controller and schema patterns.
Read [references/pitfalls.md](references/pitfalls.md) when fixing incorrect usage or mixed entrypoints.
