// The world of Meridian Run: seeded island terrain, runways and rings.
// The plane flies to the right forever; the ground is a heightfield, the sea
// is y = 0, and every sortie's rings hang over the gap between two runways.
import { makeNoise } from './random.js';
import { MISSIONS, RUNWAY_LEN } from './config.js';

const ISLAND_EVERY = 2600; // metres between island starts
const ISLAND_LEN = 1700;

export function buildWorld(seed, missionIndex) {
  const noise = makeNoise(seed * 7919 + missionIndex * 131);
  const mission = MISSIONS[missionIndex];

  // Islands: flat runway strip, then rising ground, then a dip to the sea.
  // The flat strip covers the whole runway (which starts 40 m in), so a
  // touchdown anywhere on the strip meets level ground.
  const FLAT_END = RUNWAY_LEN + 40;
  function groundHeight(x) {
    const island = Math.floor(x / ISLAND_EVERY);
    const local = x - island * ISLAND_EVERY;
    if (local < 0) return -30;
    if (local < FLAT_END) return 26; // runway plateau
    if (local > ISLAND_LEN) return -30; // open sea
    const t = (local - FLAT_END) / (ISLAND_LEN - FLAT_END);
    const hills = noise(island * 3.7 + t * 2.4) * 0.5 + 0.5;
    const peak = 50 + hills * 160 * (1 + missionIndex * 0.35);
    // Smoothstep rise: the ground stays low just past the runway (so the
    // first rings are reachable from takeoff) and swells mid-island.
    const shape = t * t * (3 - 2 * t);
    const h = 26 + shape * peak;
    // A valley along the ring course: the ground dips up to 45% between the
    // runways, so the rings hang in a canyon the plane can actually fly
    // through instead of being shoved up and down by the hills. It fades
    // in after runway 1 and out before runway 2, which both stay flat.
    const sstep = (v) => { const c = Math.max(0, Math.min(1, v)); return c * c * (3 - 2 * c); };
    const valley = 1 - 0.45 * sstep((x - 800) / 200) * (1 - sstep((x - 2400) / 200));
    return 26 + (h - 26) * valley;
  }

  const runways = [];
  for (let i = 0; i < 4; i += 1) {
    runways.push({
      x0: i * ISLAND_EVERY + 40,
      x1: i * ISLAND_EVERY + 40 + RUNWAY_LEN,
      y: 26,
      name: i === 0 ? 'Runway One' : `Runway ${i + 1}`,
    });
  }

  // Rings hang over the gap between the two runways: the course always
  // starts just past runway 1 and ends before the final approach to runway
  // 2, whatever the sortie's ring count. Altitude is a smooth curve of
  // position — a mid-course hump stepping down toward the runway — so the
  // climb or descent between two neighbours is always flyable no matter
  // how tightly the rings are spaced, and each ring is forced at least
  // 80 m above the ground beneath it, so no ring ever sits inside a hill.
  const COURSE_START = runways[0].x1 + 260;
  const COURSE_END = 2400;
  const rings = [];
  for (let i = 0; i < mission.rings; i += 1) {
    const t = mission.rings === 1 ? 0 : i / (mission.rings - 1);
    const x = COURSE_START + t * (COURSE_END - COURSE_START);
    const u = (x - COURSE_START) / (COURSE_END - COURSE_START);
    const y = Math.max(210 + 70 * Math.sin(u * Math.PI) - 70 * u + noise(i * 1.3 + 9) * 10, groundHeight(x) + 80);
    rings.push({ x, y, r: 46, passed: false });
  }

  // Clouds drift far above the sea, placed by the same seed.
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({
      x: i * 620 + noise(i * 2.1) * 300,
      y: 420 + noise(i * 3.3 + 40) * 130,
      s: 0.7 + Math.abs(noise(i * 1.7 + 7)) * 0.9,
    });
  }

  return {
    seed,
    missionIndex,
    mission,
    groundHeight,
    runways,
    rings,
    clouds,
    // The second runway is where a sortie ends: land on it, cleanly.
    homeRunway: runways[1],
  };
}

// Height of the ground under a point, in metres above the sea.
export function groundAt(world, x) {
  return world.groundHeight(x);
}

// True when the plane's nose is inside a ring it has not passed yet.
export function ringHit(world, x, y) {
  for (const ring of world.rings) {
    if (ring.passed) continue;
    const dx = x - ring.x;
    const dy = y - ring.y;
    if (dx * dx + dy * dy < ring.r * ring.r * 0.7) return ring;
  }
  return null;
}

export function ringsLeft(world) {
  return world.rings.filter((r) => !r.passed).length;
}

// True when the plane is over a runway, low and slow enough to touch down.
export function runwayUnder(world, x, y) {
  for (const runway of world.runways) {
    if (x > runway.x0 + 30 && x < runway.x1 - 30 && y <= runway.y + 14) return runway;
  }
  return null;
}
