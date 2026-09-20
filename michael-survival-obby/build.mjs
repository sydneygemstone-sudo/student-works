import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(root, '.build'), { recursive: true });
await build({
  entryPoints: [path.join(root, 'source/game.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'inline',
  outfile: path.join(root, '.build/game.js'),
});
const shell = await readFile(path.join(root, 'source/shell.html'), 'utf8');
const bundle = (await readFile(path.join(root, '.build/game.js'), 'utf8'))
  .replaceAll('</script', '<\\/script');
// A callback prevents dollar replacement patterns inside bundled code from changing it.
await writeFile(path.join(root, 'play.html'),
  shell.replace('<!-- GAME_BUNDLE -->', () => '<script>' + bundle + '</script>'));
console.log('Built self-contained play.html');
