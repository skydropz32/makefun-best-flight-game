// Meridian Run — tuning constants, palette and missions.
// One job: every number the game balances on lives here, so a tune never
// touches the physics or the drawing.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// World units are metres. Display converts: 1 m = 3.28 ft, 1 m/s = 1.94 kt.
export const SEA_Y = 0;
export const GRAVITY = 9.8;
export const LIFT_K = 0.005;
export const DRAG_K = 0.012;
export const THRUST_MAX = 26;
export const THROTTLE_RATE = 0.55;
export const PITCH_RATE = 1.9;
export const STALL_SPEED = 30;
export const MAX_SPEED = 92;
export const FUEL_BURN = 0.55; // per second at full throttle
export const FUEL_RING = 14; // fuel back per ring
export const FUEL_START = 100;
export const LIVES_START = 3;

export const STEP = 1 / 60;
export const CAM_AHEAD = 300; // metres of sky ahead of the plane on screen

// Golden-hour palette: one warm style for sky, sea and terrain.
export const PALETTE = {
  skyTop: '#2b1e5e',
  skyMid: '#b34a6e',
  skyLow: '#ff9a52',
  sunCore: '#fff3c4',
  sunGlow: '#ffb347',
  seaDeep: '#123a5c',
  seaGlint: '#ffcf8a',
  mountainFar: '#6d4a7d',
  mountainMid: '#4a2f5e',
  mountainNear: '#33244a',
  groundTop: '#c98f4e',
  groundRock: '#6b4a3a',
  sand: '#e8c98a',
  runway: '#3a3f4a',
  runwayLine: '#f5e9c8',
  ring: '#ffd94a',
  ringGlow: '#ffedb0',
  hudInk: '#fff6e0',
  hudDim: '#ffd9a0',
  hudDanger: '#ff5a4e',
};

export const MISSIONS = [
  {
    name: 'Sortie 1 — First Light',
    brief: 'Take off, thread 4 rings, land on Runway Two.',
    rings: 4,
    wind: 0,
    fuel: 100,
  },
  {
    name: 'Sortie 2 — Crosswind',
    brief: '6 rings through the canyon, wind from the west. Mind your fuel.',
    rings: 6,
    wind: -6,
    fuel: 90,
  },
  {
    name: 'Sortie 3 — Last Light',
    brief: '8 rings at dusk, tight fuel. Land clean to finish the run.',
    rings: 8,
    wind: 5,
    fuel: 80,
  },
];

// Where each ring sits, relative to its sortie's runway gap (metres).
export const RING_SPACING = 420;
export const RUNWAY_LEN = 620;
