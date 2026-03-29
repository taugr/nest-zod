# Runtime Pitfalls

## Mixing entrypoints

If the task is runtime-only, keep all `nest-zod` imports on the root entrypoint:

```ts
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
```

Do not mix `nest-zod` and `nest-zod/swagger` in the same controller unless the task explicitly requires the Swagger-aware entrypoint.

## Adding global registration

Do not add global Nest registration for this library. The decorators already attach the needed validation pipe or serializer interceptor.

Avoid adding:

- `APP_PIPE` for `nest-zod`
- `APP_INTERCEPTOR` for `nest-zod`
- `useGlobalInterceptors()` just to enable `ZSerialize`

## Wrong query decorator form

- Whole query object: `@ZQuery(schema)`
- Named query param: `@ZQuery('name', schema)`

Do not use the whole-query form for a scalar or specifically named parameter.

## Treating `ZSerialize` like input validation

`ZSerialize` defines the outbound response contract. Fix the returned value or the response schema rather than leaving them drifted apart.
