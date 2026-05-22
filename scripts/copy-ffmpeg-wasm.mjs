import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'public', 'ffmpeg');

mkdirSync(dest, { recursive: true });

// Copy Core
const coreDist = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
copyFileSync(join(coreDist, 'ffmpeg-core.js'),   join(dest, 'ffmpeg-core.js'));
copyFileSync(join(coreDist, 'ffmpeg-core.wasm'), join(dest, 'ffmpeg-core.wasm'));

function copyDirRecursive(src, dst) {
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const dstPath = join(dst, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
  }
}

// Copy FFmpeg ESM
copyDirRecursive(
  join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm'),
  join(dest, 'ffmpeg-esm')
);

// Copy Util ESM
copyDirRecursive(
  join(root, 'node_modules', '@ffmpeg', 'util', 'dist', 'esm'),
  join(dest, 'util-esm')
);

console.log('✅ FFmpeg WASM, ESM, and Util copied to /public/ffmpeg/');
