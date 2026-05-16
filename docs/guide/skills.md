# AI Skills

This repository includes two AI skills in `skills/`:

- `nest-zod-runtime`
- `nest-zod-swagger`

Use `nest-zod-runtime` when you want imports from `nest-zod`. Use `nest-zod-swagger` when you want imports from `nest-zod/swagger` and generated OpenAPI metadata.

## Install The Skills

Install the repository skills:

```sh
npx skills add taugr/nest-zod
```

The `skills` CLI installs the selected skill into your local agent-specific directories.

## Use The Skills

After installation, call the skill by name in your prompt.

Runtime-only example:

```text
Use $nest-zod-runtime to update this controller to runtime-only nest-zod usage.
```

Swagger-aware example:

```text
Use $nest-zod-swagger to add Swagger-aware nest-zod decorators and OpenAPI metadata to this controller.
```

## Which Skill To Choose

Choose `nest-zod-runtime` when you want:

- imports from `nest-zod`
- runtime request parsing and response serialization only
- no generated Swagger metadata

Choose `nest-zod-swagger` when you want:

- imports from `nest-zod/swagger`
- the same runtime behavior
- generated OpenAPI metadata from the same Zod schemas
