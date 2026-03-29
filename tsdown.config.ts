import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    swagger: 'src/swagger.ts',
  },
  dts: {
    tsgo: true,
  },
  exports: true,
});
