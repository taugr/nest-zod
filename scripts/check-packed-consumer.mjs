import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'nest-zod-consumer-'));
const packageDirectory = join(temporaryRoot, 'package');
const consumerDirectory = join(temporaryRoot, 'consumer');
const npmCache = join(temporaryRoot, 'npm-cache');
const nestVersion = process.env.NEST_VERSION ?? '^12.0.0';
const swaggerVersion = process.env.SWAGGER_VERSION ?? '^12.0.0';
const packageVersion = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
).version;

function run(command, args, cwd) {
  const environment = {
    ...process.env,
    npm_config_cache: npmCache,
  };
  delete environment.npm_config_manage_package_manager_versions;

  execFileSync(command, args, {
    cwd,
    env: environment,
    stdio: 'inherit',
  });
}

try {
  mkdirSync(packageDirectory);
  mkdirSync(consumerDirectory);

  run(
    'npm',
    ['pack', '--ignore-scripts', '--pack-destination', packageDirectory],
    repositoryRoot,
  );

  const tarball = join(packageDirectory, `nest-zod-${packageVersion}.tgz`);
  writeFileSync(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'nest-zod-packed-consumer',
        private: true,
        type: 'module',
      },
      null,
      2,
    ),
  );

  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      tarball,
      `@nestjs/common@${nestVersion}`,
      `@nestjs/core@${nestVersion}`,
      `@nestjs/swagger@${swaggerVersion}`,
      '@types/node@^22.0.0',
      'reflect-metadata@^0.2.0',
      'rxjs@^7.0.0',
      'typescript@^6.0.0',
      'zod@^4.0.0',
    ],
    consumerDirectory,
  );

  writeFileSync(
    join(consumerDirectory, 'esm.mjs'),
    [
      "import { ZBody, ZValidationPipe } from 'nest-zod';",
      "import { ZSerialize } from 'nest-zod/swagger';",
      '',
      "if (typeof ZBody !== 'function') throw new Error('Missing root ESM export');",
      "if (typeof ZValidationPipe !== 'function') throw new Error('Missing pipe ESM export');",
      "if (typeof ZSerialize !== 'function') throw new Error('Missing Swagger ESM export');",
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(consumerDirectory, 'commonjs.cjs'),
    [
      "const { ZBody, ZValidationPipe } = require('nest-zod');",
      "const { ZSerialize } = require('nest-zod/swagger');",
      '',
      "if (typeof ZBody !== 'function') throw new Error('Missing root CommonJS export');",
      "if (typeof ZValidationPipe !== 'function') throw new Error('Missing pipe CommonJS export');",
      "if (typeof ZSerialize !== 'function') throw new Error('Missing Swagger CommonJS export');",
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(consumerDirectory, 'types.mts'),
    [
      "import { BadRequestException } from '@nestjs/common';",
      "import { z } from 'zod';",
      "import { ZBody, ZValidationPipe, ZSerialize } from 'nest-zod';",
      "import { ZBody as SwaggerZBody } from 'nest-zod/swagger';",
      '',
      'const schema = z.string().transform(async (value) => value.length);',
      'const pipe = new ZValidationPipe(schema, { async: true });',
      'const parsed: Promise<number> = pipe.transform("value", { type: "body" });',
      'void parsed;',
      '// @ts-expect-error async generic mode requires the matching runtime option',
      'new ZValidationPipe<typeof schema, true>(schema);',
      'const syncParsed: string = new ZValidationPipe(z.string()).transform(',
      '  "value",',
      '  { type: "body" },',
      ');',
      'void syncParsed;',
      'ZBody(schema, {',
      '  validation: {',
      '    async: true,',
      '    exceptionFactory: (error) =>',
      '      new BadRequestException({ message: "Invalid", issues: error.issues }),',
      '  },',
      '});',
      'SwaggerZBody(schema, { validation: { async: true } });',
      'ZSerialize(schema, { serialization: { async: true } });',
      '',
    ].join('\n'),
  );

  run(process.execPath, ['esm.mjs'], consumerDirectory);
  run(process.execPath, ['commonjs.cjs'], consumerDirectory);
  run(
    join(consumerDirectory, 'node_modules', '.bin', 'tsc'),
    [
      '--noEmit',
      '--strict',
      '--target',
      'ES2023',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--types',
      'node',
      'types.mts',
    ],
    consumerDirectory,
  );

  console.log(
    `Packed consumer passed with Nest ${nestVersion} and Swagger ${swaggerVersion}.`,
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
