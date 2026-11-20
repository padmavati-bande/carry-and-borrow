// Run with: node tests/pwa.test.js
// Checks the install icons exist with the right PNG size, and index.html links them.
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pngSize = (file) => {
  const b = fs.readFileSync(path.join(root, 'public', file));
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

for (const [file, size] of [
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
  ['icons/icon-maskable-512.png', 512],
  ['icons/apple-touch-icon.png', 180],
]) {
  assert.deepStrictEqual(pngSize(file), [size, size], `${file} size`);
}
assert.ok(fs.existsSync(path.join(root, 'public', 'icon.svg')), 'icon.svg exists');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /rel="apple-touch-icon" href="icons\/apple-touch-icon\.png"/, 'index.html links apple icon');
assert.match(html, /rel="icon" href="icon\.svg"/, 'index.html links favicon');

console.log('OK - pwa: install icons present and sized, index.html links them.');
