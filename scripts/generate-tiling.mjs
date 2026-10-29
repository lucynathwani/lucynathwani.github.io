// Robinson-triangle subdivision of a Penrose tiling. The shared bases are
// omitted from the outlines so pairs of triangles read as rhombus tiles.
import { mkdirSync, writeFileSync } from 'node:fs';

const phi = (1 + Math.sqrt(5)) / 2;
const point = angle => [420 * Math.cos(angle), 420 * Math.sin(angle)];
const between = (a, b) => a.map((v, i) => v + (b[i] - v) / phi);
let triangles = Array.from({ length: 10 }, (_, i) => {
  let b = point((2 * i - 1) * Math.PI / 10);
  let c = point((2 * i + 1) * Math.PI / 10);
  if (i % 2 === 0) [b, c] = [c, b];
  return [0, [0, 0], b, c];
});

for (let level = 0; level < 5; level++) {
  triangles = triangles.flatMap(([type, a, b, c]) => {
    if (type === 0) {
      const p = between(a, b);
      return [[0, c, p, b], [1, p, c, a]];
    }
    const q = between(b, a);
    const r = between(b, c);
    return [[1, r, c, a], [1, q, r, b], [0, r, q, a]];
  });
}

const xy = p => p.map(n => n.toFixed(3)).join(',');
const fills = ['#9fb9cb', '#dce6eb'];
const tiles = triangles.map(([type, a, b, c]) =>
  `<path d="M${xy(a)}L${xy(b)}L${xy(c)}Z" fill="${fills[type]}" stroke="${fills[type]}" stroke-width="0.2"/>`
).join('\n');
const edges = triangles.map(([, a, b, c]) =>
  `M${xy(b)}L${xy(a)}L${xy(c)}`
).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1184 420">
<title>Penrose rhombus tiling</title>
<desc>A two-color nonperiodic mosaic, with blue thin rhombi and pale blue thick rhombi.</desc>
<rect width="1184" height="420" fill="${fills[1]}"/>
<g transform="translate(592 210) scale(1.8)">
${tiles}
<path d="${edges}" fill="none" stroke="${fills[0]}" stroke-width="0.6" stroke-linejoin="round"/>
</g>
</svg>\n`;
mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
writeFileSync(new URL('../assets/penrose-tiling.svg', import.meta.url), svg);
