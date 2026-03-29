import { defineConfig } from 'vitepress';
import { transformerTwoslash } from '@shikijs/vitepress-twoslash';
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import llmstxt from 'vitepress-plugin-llms';
import pkg from '../../package.json';

const __dirname = dirname(fileURLToPath(import.meta.url));
type VitePlugins = NonNullable<
  NonNullable<Parameters<typeof defineConfig>[0]['vite']>['plugins']
>;

export default defineConfig({
  title: 'nest-zod',
  description:
    'Zod-powered request validation, query parsing, response serialization, and Swagger metadata for NestJS.',
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }],
    [
      'meta',
      {
        name: 'keywords',
        content: 'nestjs,zod,swagger,openapi,validation,serialization',
      },
    ],
    [
      'meta',
      {
        property: 'og:title',
        content: 'nest-zod',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Zod-powered request validation, query parsing, response serialization, and Swagger metadata for NestJS.',
      },
    ],
    ['meta', { property: 'og:image', content: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#EA2845' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
    },
    nav: [
      {
        text: 'Guide',
        items: [
          { text: 'Overview', link: '/guide/' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Runtime Only', link: '/guide/runtime-only' },
          { text: 'Swagger', link: '/guide/swagger' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API Reference', link: '/guide/api-reference' },
          { text: 'Development', link: '/guide/playground' },
        ],
      },
      {
        text: `v${pkg.version}`,
        items: [
          {
            text: `Package v${pkg.version}`,
            link: 'https://www.npmjs.com/package/nest-zod',
          },
          {
            text: 'Releases',
            link: 'https://github.com/tom-auger/nest-zod/releases',
          },
          {
            text: 'Contributing',
            link: 'https://github.com/tom-auger/nest-zod/blob/main/CONTRIBUTING.md',
          },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'What Is nest-zod?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Usage',
          collapsed: false,
          items: [
            { text: 'Runtime Only', link: '/guide/runtime-only' },
            { text: 'Swagger', link: '/guide/swagger' },
          ],
        },
        {
          text: 'Reference',
          collapsed: false,
          items: [{ text: 'API Reference', link: '/guide/api-reference' }],
        },
        {
          text: 'Repository',
          collapsed: false,
          items: [{ text: 'Development Playground', link: '/guide/playground' }],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/tom-auger/nest-zod' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Tom Auger',
    },
  },
  markdown: {
    codeTransformers: [
      transformerTwoslash({
        twoslashOptions: {
          compilerOptions: {
            baseUrl: resolve(__dirname, '../..'),
            experimentalDecorators: true,
            module: ts.ModuleKind.Preserve,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            paths: {
              'nest-zod': ['src/index.ts'],
              'nest-zod/swagger': ['src/swagger.ts'],
            },
          },
        },
      }),
    ],
    languages: ['ts', 'js'],
    config(md) {
      md.use(groupIconMdPlugin);
    },
  },
  vite: {
    plugins: [groupIconVitePlugin(), llmstxt()] as unknown as VitePlugins,
  },
});
