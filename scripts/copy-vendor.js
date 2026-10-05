import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'node_modules/gsap/dist');
const destination = resolve(root, 'public/vendor');
mkdirSync(destination, { recursive: true });

for (const file of ['gsap.min.js', 'Flip.min.js', 'ScrollTrigger.min.js', 'DrawSVGPlugin.min.js', 'CustomEase.min.js']) {
  copyFileSync(resolve(source, file), resolve(destination, file));
}
