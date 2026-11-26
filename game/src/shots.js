// The screenshot scenes behind ?shot=takeoff|ring|canyon|landing.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot (aim at the next ring,
// keep speed in the cruise band, flare for the runway), so the frame is what
// a short game really looks like and the same seed always gives the same
// frame. Nothing here edits a screenshot: the game draws it.
import { STEP } from './config.js';
import { SCREEN_LANDED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;

// Steer toward a target point: returns { pitch, throttle } for one step.
// Climbs early to a safe altitude when the target is far away, pulls up
// hard when the ground ahead is higher than the plane, and holds full power
// while climbing toward the target.
export function autopilot(game, target) {
  const { plane, world } = game;
  const ahead = world.groundHeight(plane.x + 160);
  const dx = target.x - plane.x;
  const dist = Math.abs(dx);
  // Far from the target: climb to a safe altitude first, then dive to it.
  // A final (landing) target is aimed at directly, from any distance, so
  // the descent starts early enough to make the glide slope.
  const aimY = target.final || dist <= 350 ? target.y : Math.max(target.y, 260);
  const dy = aimY - plane.y;
  let wantAngle = Math.max(-0.5, Math.min(0.5, Math.atan2(dy, Math.max(40, dx)) * 0.9));
  // Do not climb steeply while slow: a stall bleeds the speed a climb needs.
  if (plane.speed < 38) wantAngle = Math.min(wantAngle, 0.25);
  // Terrain ahead: pull up — unless on final over the runway and already
  // descending to land, where pulling up would float the plane past the
  // strip into the hills beyond it.
  const rw0 = world.homeRunway;
  const overRw = plane.x > rw0.x0 && plane.x < rw0.x1;
  if (ahead > plane.y - 10 && !(target.final && overRw && plane.vy < 0)) wantAngle = 0.5;
  // Throttle is a RATE, not a target: 1 spools up, -1 spools down, 0 holds.
  // Full power while climbing toward the target, cut power to lose lift and
  // descend when well above it and still fast (never so long the plane
  // stalls), hold once level — a small positive delta would creep the
  // throttle to full and float the plane past the runway.
  let throttle = plane.y > target.y + 40 && plane.speed > 42 ? -1
    : plane.y < target.y - 20 || plane.speed < 34 ? 1
    : plane.speed > 47 ? -1 : 0;
  // Flare: low over the home runway and sinking hard — nose up a touch,
  // hold power, soften the touchdown. Only below 45 m (about 20 m above
  // the strip) and only for a hard sink: flaring a gentle descent floats
  // the plane past the runway into the hills beyond it.
  const rw = world.homeRunway;
  const overRunway = plane.x > rw.x0 && plane.x < rw.x1;
  if (target.final && overRunway && plane.y < 45 && plane.vy < -8) {
    wantAngle = 0.08;
    throttle = 0.5;
  }
  // Firm descent on final: once over the strip, point the nose down at the
  // runway and commit — a shallow asymptotic glide never reaches the
  // surface before the strip runs out.
  if (target.final && overRunway && plane.y > 34 && plane.vy > -8) {
    wantAngle = -0.18;
  }
  // On the ground after touchdown: idle, let the brakes do their work.
  if (target.final && plane.y <= world.groundHeight(plane.x) + 4) throttle = -1;
  const pitch = Math.max(-1, Math.min(1, (wantAngle - plane.angle) * 3));
  return { pitch, throttle };
}

export function nextTarget(game) {
  const { plane, world } = game;
  // The first ring the plane has not passed AND not flown past: a missed
  // ring is left behind (no points for it), the sortie goes on — the plane
  // cannot turn around, so chasing a ring behind it would fly the sortie
  // into the hills forever.
  const ring = world.rings.find((r) => !r.passed && r.x > plane.x - 150);
  if (ring) return { x: ring.x, y: ring.y, final: false };
  // No rings left: land on Runway Two. Aim at the threshold first, then at
  // a point just ahead on the strip, BELOW its surface, so the plane keeps
  // descending onto it instead of asymptoting above it and floating past
  // the far end into the hills.
  const rw = world.homeRunway;
  if (plane.x < rw.x0) return { x: rw.x0 + 150, y: rw.y + 45, final: true };
  return { x: Math.min(plane.x + 250, rw.x1 - 60), y: rw.y - 10, final: true };
}

// Run the simulation forward for `seconds`, steered by the autopilot.
export function flyForward(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const target = nextTarget(game);
    const { pitch, throttle } = autopilot(game, target);
    const event = game.step(STEP, pitch, throttle);
    if (event === 'landed' || event === 'crashed') break;
  }
}

/**
 * Set the game to the named scene and return the screen to draw.
 * takeoff: on the runway, engines spooling. ring: mid-flight through a ring.
 * canyon: low fast pass between islands. landing: on final approach.
 */
export function stageShot(name, game) {
  game.newRun();
  if (name === 'takeoff') {
    game.step(STEP, 0, 0);
    game.screen = SCREEN_TITLE;
    return SCREEN_TITLE;
  }
  if (name === 'ring') {
    flyForward(game, 20);
    game.screen = SCREEN_PLAY;
    return SCREEN_PLAY;
  }
  if (name === 'canyon') {
    flyForward(game, 32);
    game.screen = SCREEN_PLAY;
    return SCREEN_PLAY;
  }
  if (name === 'landing') {
    flyForward(game, 46);
    // Force the final approach: plane low over runway two, gear down.
    const rw = game.world.homeRunway;
    game.plane.x = rw.x0 + 180;
    game.plane.y = rw.y + 55;
    game.plane.vx = 34;
    game.plane.vy = -3;
    game.plane.angle = -0.06;
    game.plane.throttle = 0.35;
    game.screen = SCREEN_PLAY;
    return SCREEN_PLAY;
  }
  game.screen = SCREEN_TITLE;
  return SCREEN_TITLE;
}
