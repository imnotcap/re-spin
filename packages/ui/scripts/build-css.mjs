// Samler CSS til dist/: styles.css = tokens + hjælpere + komponenter
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFile(join(root, 'src/styles', f), 'utf8');
await mkdir(join(root, 'dist'), { recursive: true });
const styles = (await Promise.all(['tokens.css', 'utilities.css', 'components.css'].map(read))).join('\n');
await writeFile(join(root, 'dist/styles.css'), styles);
await writeFile(join(root, 'dist/reset.css'), await read('reset.css'));
await writeFile(join(root, 'dist/fonts.css'), await read('fonts.css'));
console.log('CSS bygget:', (styles.length / 1024).toFixed(1), 'kB');
