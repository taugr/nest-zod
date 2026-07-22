# AGENTS.md

Guidance for coding agents working in this repository.

## Repo Overview

- Package manager: `pnpm` 10
- Runtime baseline: Node.js 22+
- Workspace layout:
  - `src/`: published `nest-zod` library code
  - `tests/`: library test suite run with Vitest
  - `playground/`: small Nest app used to validate real consumer flows
  - `docs/`: VitePress documentation site

This repo is a small pnpm workspace with the root package and the `playground` app.

## What Matters Here

- `nest-zod` provides Zod-powered request parsing and response serialization for NestJS.
- There are two public import surfaces:
  - `nest-zod`: runtime behavior only
  - `nest-zod/swagger`: runtime behavior plus Swagger/OpenAPI metadata
- Changes that affect decorators, serialization, deserialization, or OpenAPI behavior should usually be covered by tests and verified in the playground if the consumer experience changed.

## Common Commands

Install dependencies:

```bash
pnpm install
```

Core validation:

```bash
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:coverage
```

Formatting:

```bash
pnpm run fmt
pnpm run fmt:fix
pnpm run lint:fix
```

Playground and docs:

```bash
pnpm run playground:dev
pnpm run playground:start
pnpm run build:playground
pnpm run docs:dev
pnpm run docs:build
```

## Expected Workflow

1. Read the affected module and nearby tests before editing.
2. Keep library changes focused in `src/`.
3. Add or update tests in `tests/` for behavior changes.
4. If the change affects public usage, examples, Nest integration, or Swagger output, verify it in `playground/`.
5. Update `README.md` and `docs/` when public API or user workflow changes.

## Change Guidance

- Prefer minimal API surface changes.
- Preserve both import paths unless the task explicitly changes public exports.
- Keep examples aligned across `README.md`, `docs/`, and `playground/` when user-facing behavior changes.
- Do not edit generated output under `docs/.vitepress/dist/` unless the task is explicitly about built artifacts.
- Avoid committing local build outputs like `coverage/` or `dist/` unless the user explicitly asks.

## Testing Guidance

- Library tests live in `tests/*.test.ts`.
- Playground integration coverage lives in `playground/test/`.
- For library-only internal changes, run:

```bash
pnpm run lint
pnpm run test
pnpm run build
```

- For behavior changes that affect consumers, prefer:

```bash
pnpm run lint
pnpm run test:coverage
pnpm run build:playground
```

- CI currently runs:
  - `pnpm install`
  - `pnpm run build`
  - `pnpm run lint`
  - `pnpm run test:coverage`

## File-Specific Notes

- `src/index.ts`: root public exports
- `src/swagger.ts`: Swagger/OpenAPI-aware entrypoint
- `src/decorators.ts`: Nest decorators and request parsing behavior
- `src/deserialize.ts`: inbound parsing helpers
- `src/serialize.ts`: outbound encoding/serialization behavior
- `src/openapi-schema.ts`: OpenAPI schema conversion logic

## Agent Rules

- Prefer `rg` for search and `rg --files` for file discovery.
- Match existing TypeScript and NestJS patterns before introducing new abstractions.
- Do not assume a separate `typecheck` script exists; `pnpm run build` is the closest validation step.
- If you modify public behavior, document it in the same change when practical.
- Before finishing, report which verification commands you ran and whether they passed.
