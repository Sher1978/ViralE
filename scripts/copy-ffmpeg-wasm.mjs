import { copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'public', 'ffmpeg');

mkdirSync(dest, { recursive: true });

const coreDist = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
copyFileSync(join(coreDist, 'ffmpeg-core.js'),   join(dest, 'ffmpeg-core.js'));
copyFileSync(join(coreDist, 'ffmpeg-core.wasm'), join(dest, 'ffmpeg-core.wasm'));

console.log('✅ FFmpeg WASM copied to /public/ffmpeg/');
