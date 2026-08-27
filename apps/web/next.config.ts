import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function onnxRuntimeBrowser(file: string): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules/onnxruntime-web', file),
    path.join(process.cwd(), 'apps/web/node_modules/onnxruntime-web', file),
  ];
  try {
    candidates.unshift(
      path.join(path.dirname(require.resolve('onnxruntime-web/package.json')), file),
    );
  } catch {
    // pnpm / exports may hide package.json; fall through to cwd paths
  }
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0]!;
}

const nextConfig: NextConfig = {
  transpilePackages: [
    '@sn-editor/editor-core',
    '@sn-editor/image-engine',
    '@sn-editor/video-engine',
    '@sn-editor/ai-contracts',
    '@sn-editor/shared',
    '@sn-editor/ui',
    '@sn-editor/auth',
    '@sn-editor/db',
  ],
  reactStrictMode: true,
  serverExternalPackages: ['onnxruntime-web', '@imgly/background-removal', 'mongoose', 'stripe', 'bcryptjs'],
  experimental: {
    optimizePackageImports: ['@sn-editor/ui', '@sn-editor/shared'],
  },
  webpack: (config) => {
    // Konva browser build — avoid Node canvas during SSR/bundling
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      'konva/lib/index-node.js': 'konva/lib/index.js',
      sharp: false,
      'onnxruntime-node': false,
      'onnxruntime-web$': onnxRuntimeBrowser('dist/ort.wasm.bundle.min.mjs'),
      'onnxruntime-web/webgpu': onnxRuntimeBrowser('dist/ort.webgpu.bundle.min.mjs'),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      canvas: false,
    };
    // Do NOT externalize `canvas` — that emits require('canvas') and breaks
    // prerender when the native package isn't installed. Alias/fallback stub it.
    return config;
  },
};

export default nextConfig;
