// Seeded randomness for Meridian Run: the same seed always builds the same
// islands, so a screenshot can be reproduced exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise over integer lattice points.
export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const table = new Float64Array(512);
  for (let i = 0; i < 512; i += 1) table[i] = rand() * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = table[((xi % 512) + 512) % 512];
    const b = table[((xi + 1) % 512 + 512) % 512];
    return a + (b - a) * fade(xf);
  };
}
