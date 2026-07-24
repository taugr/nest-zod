# Contributing to nest-zod

Thanks for contributing.

## Setup

Requirements:

- Node.js 22+
- `pnpm` 11

Clone the repo and install dependencies:

```bash
git clone https://github.com/taugr/nest-zod.git
cd nest-zod
pnpm install
```

This repo is a small pnpm workspace:

- the library lives at `src/`
- the demo Nest app lives at `playground/`

## Common Commands

```bash
pnpm run test
pnpm run lint
pnpm run fmt
pnpm run build
pnpm run playground:start
pnpm run playground:dev
```

Useful variants:

```bash
pnpm run lint:fix
pnpm run fmt:fix
pnpm run test:coverage
pnpm run build:playground
pnpm run docs:build
pnpm run test:consumer
pnpm peers check
```

## Workflow

1. Make changes in the library under `src/` and add or update tests.
2. If the change affects consumer usage, verify it in the playground app under `playground/`.
3. Run `pnpm run fmt`, `pnpm run lint`, and `pnpm run test:coverage`.
4. Run `pnpm run build` for library-only changes, or `pnpm run build:playground` if the playground changed too.
5. Update `README.md` when the public API or developer workflow changes.

## Testing

- Library tests live under `tests/`
- Playground integration tests live under `playground/test/`

Run the full suite:

```bash
pnpm run test
```

## Pull Requests

- Keep changes focused.
- Add tests for behavior changes.
- Prefer updating documentation in the same PR when user-facing behavior changes.
- If you add a new example or workflow, keep the playground and README aligned.

## Questions

Open an issue at [github.com/taugr/nest-zod/issues](https://github.com/taugr/nest-zod/issues).
