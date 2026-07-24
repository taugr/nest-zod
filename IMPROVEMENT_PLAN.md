# nest-zod Improvement Plan

## Goal

Strengthen `nest-zod` around correctness, diagnosability, compatibility, and
documentation without expanding the decorator surface unnecessarily.

This plan covers local implementation and verification. Commit, push, release,
and deployment remain separate approval gates.

## Scope

### 1. Preserve OpenAPI schema fidelity

- Stop rebuilding Zod object, array, union, and wrapper schemas in ways that
  discard metadata or constraints.
- Preserve the documented input/encoded-wire behavior for top-level codecs.
- Add regression coverage for array limits, descriptions, nested codecs,
  wrappers, object modes, and unions.
- Keep recursive OpenAPI references explicitly unsupported until the package has
  a real component-registration design.

### 2. Improve validation and serialization behavior

- Add a configurable validation exception factory while preserving the current
  generic `400` response by default.
- Add opt-in async parsing and encoding for schemas with asynchronous
  refinements, transforms, or codecs.
- Generate Swagger required/nullable metadata for async schemas without
  executing user validation code during decoration.
- Keep the pipe's generic async return type aligned with the constructor's
  runtime option.
- Keep synchronous behavior as the default so direct users of the exported pipe
  and interceptor do not receive a breaking return-type change.
- Make pipe and interceptor types retain the schema input/output relationship.
- Expose the same runtime options through both package entrypoints.

### 3. Verify the supported consumer surface

- Test the packed package from a clean temporary consumer rather than relying
  only on workspace linking.
- Exercise ESM and CommonJS loading.
- Add representative NestJS and Swagger peer-version combinations.
- Run the minimum Node.js version and the current LTS line in CI.
- Add formatting, playground, docs, peer, and package checks before merge.

### 4. Correct and focus the documentation

- Describe `refId` as an internal schema-generation identifier; it does not
  create reusable `components.schemas` entries.
- Document recursive-reference, query-parser, async-mode, and error-response
  boundaries.
- Expand the API reference to include exported classes, helpers, and options.
- Correct pnpm and project-link metadata.
- Keep the existing quick start concise.

## Implementation Decisions

- Async operation is enabled with nested runtime options:
  - `validation: { async: true }`
  - `serialization: { async: true }`
- Validation customization uses
  `validation: { exceptionFactory: (error) => exception }`.
- The root and Swagger-aware decorators accept the same runtime option shape.
  Swagger decorators continue to accept their existing OpenAPI options.
- `refId` remains backward-compatible but will not be presented as a component
  registration feature.
- Real reusable OpenAPI components and recursive schemas are deferred because
  they require document-level registration and would materially change emitted
  specifications.

## Verification

- `pnpm run build`
- `pnpm run fmt`
- `pnpm run lint`
- `pnpm run test:coverage`
- `pnpm run build:playground`
- `pnpm run docs:build`
- `pnpm peers check`
- packed-consumer checks
- `pnpm pack --dry-run`
- final diff and clean generated-output review

## Delivery Gates

- [x] Implementation complete
- [x] Local verification complete
- [x] Maintainer review
- [x] Commit approved
- [x] Push approved
- [x] Release approved
- [x] Deployment approved

## Verification Result

Completed locally on 2026-07-24:

- Node.js 22: build and 90 tests with 100% statement, branch, function, and
  line coverage
- Node.js 24: build and the same full-coverage test suite
- formatting and lint
- playground build and integration coverage
- VitePress build
- peer dependency check
- packed ESM, CommonJS, and TypeScript consumer with Nest 10 / Swagger 8
- packed ESM, CommonJS, and TypeScript consumer with Nest 11 / Swagger 11
- package dry-run and tarball content review
- workflow YAML parse and final diff checks

The maintainer-review follow-up also verifies that async Swagger schemas are
not executed during required/nullable metadata generation and that an explicit
`ZValidationPipe<Schema, true>` generic requires the matching `{ async: true }`
runtime option.

The package dry-run completed successfully with the existing sandbox-only Husky
warning about locking `.git/config`.
