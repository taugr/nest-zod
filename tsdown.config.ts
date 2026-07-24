import { defineConfig } from 'tsdown';

const typescriptPackageUrl = import.meta
  .resolve('@typescript/native/package.json');
const { default: getTypeScriptExecutablePath } = await import(
  new URL('./lib/getExePath.js', typescriptPackageUrl).href
);

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    swagger: 'src/swagger.ts',
  },
  dts: {
    tsgo: {
      path: getTypeScriptExecutablePath(),
    },
  },
  exports: true,
});
