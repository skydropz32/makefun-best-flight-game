// The Kestrel: flight model and drawing for Meridian Run.
// Lift grows with speed squared, so throttle and pitch discipline decide
// whether you climb, cruise, stall or slam into the sea.
import {
  DRAG_K, FUEL_BURN, GRAVITY, LIFT_K, MAX_SPEED, PITCH_RATE, STALL_SPEED,
  THROTTLE_RATE, THRUST_MAX,
} from './config.js';
import { groundAt, ringHit, ringsLeft, runwayUnder } from './world.js';

export function makePlane() {
  return {
    x: 120, // metres along the world
    y: 40, // metres above the sea
    vx: 0,
    vy: 0,
    angle: 0, // radians, 0 = level east
    throttle: 0,
    fuel: 100,
    damage: 0, // 0..100, 100 = wrecked
    speed: 0,
    verticalSpeed: 0,
    flares: 0, // particles left to draw after a flare burst
    airborne: false, // true once the plane has left the ground this sortie
  };
}

export function resetPlane(plane, runway) {
  plane.x = runway.x0 + 120;
  plane.y = runway.y + 2;
  plane.vx = 0;
  plane.vy = 0;
  plane.angle = 0;
  plane.throttle = 0;
  plane.fuel = 100;
  plane.damage = 0;
  plane.speed = 0;
  plane.verticalSpeed = 0;
  plane.flares = 0;
  plane.airborne = false;
}

// One fixed step. Returns an event string: 'ring' | 'landed' | 'crashed' | ''.
export function stepPlane(plane, dt, pitch, throttleDelta, world, wind) {
  plane.throttle = Math.max(0, Math.min(1, plane.throttle + throttleDelta * THROTTLE_RATE * dt));
  const targetAngle = pitch * 0.55;
  plane.angle += (targetAngle - plane.angle) * Math.min(1, PITCH_RATE * dt);

  const speed = Math.hypot(plane.vx, plane.vy);
  const thrust = plane.throttle * THRUST_MAX;
  const ax = Math.cos(plane.angle) * thrust - DRAG_K * speed * plane.vx + wind;
  const lift = LIFT_K * speed * speed;
  const ay = Math.sin(plane.angle) * thrust + lift * Math.cos(plane.angle) - GRAVITY - DRAG_K * speed * plane.vy;
  plane.vx += ax * dt;
  plane.vy += ay * dt;
  plane.x += plane.vx * dt;
  plane.y += plane.vy * dt;
  plane.speed = Math.hypot(plane.vx, plane.vy);
  plane.verticalSpeed = plane.vy;

  if (plane.throttle > 0.05) plane.fuel = Math.max(0, plane.fuel - FUEL_BURN * plane.throttle * dt);
  if (plane.fuel <= 0 && plane.throttle > 0) plane.throttle = 0;

  // Stall: too slow and the wing gives up — the nose drops, hard.
  if (plane.speed < STALL_SPEED && plane.y > groundAt(world, plane.x) + 4) {
    plane.vy -= 14 * dt;
    plane.angle += (0.5 - plane.angle) * dt * 0.8;
  }
  if (plane.speed > MAX_SPEED) {
    const k = MAX_SPEED / plane.speed;
    plane.vx *= k;
    plane.vy *= k;
  }

  const ring = ringHit(world, plane.x + 14, plane.y);
  if (ring) {
    ring.passed = true;
    plane.fuel = Math.min(100, plane.fuel + 14);
    return 'ring';
  }

  const ground = groundAt(world, plane.x);
  if (plane.y > ground + 10) plane.airborne = true;
  const runway = runwayUnder(world, plane.x, plane.y);
  if (plane.y <= ground + 2) {
    // On the ground. Pavement is forgiving: a gentle touchdown is a landing
    // (or a takeoff roll — nose-up rotation is normal); a hard impact or a
    // nose-down scrape is a wreck. Anything off-pavement is a wreck.
    // A firm touchdown (up to 9 m/s down) still counts — anything harder
    // breaks the landing gear.
    plane.y = ground + 2;
    if (runway && Math.abs(plane.vy) < 9 && plane.angle > -0.35) {
      plane.vy = 0;
      if (plane.airborne && plane.speed < 8) return 'landed';
      // Wheel brakes on the landing roll (not the takeoff roll).
      if (plane.airborne) plane.vx *= 0.99;
      return '';
    }
    plane.damage = 100;
    return 'crashed';
  }
  if (plane.y > 900) {
    plane.y = 900;
    plane.vy = Math.min(plane.vy, 0);
  }
  if (plane.x < 0) {
    plane.x = 0;
    plane.vx = Math.max(plane.vx, 0);
  }
  return '';
}

export function ringsPassed(world) {
  return world.rings.length - ringsLeft(world);
}

// Draw the Kestrel at screen position (sx, sy), nose east, banked by angle.
export function drawPlane(ctx, sx, sy, angle, time, throttle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  const prop = Math.abs(Math.sin(time * 40)) * 0.9 + 0.1;
  // Prop blur disc.
  ctx.strokeStyle = 'rgba(255,240,200,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(26, 0, 4, 16 * prop + 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Tail.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.lineTo(-30, -14);
  ctx.lineTo(-24, -2);
  ctx.closePath();
  ctx.fill();
  // Fuselage: warm cream with a red cheatline, built not drawn flat.
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.quadraticCurveTo(18, -9, -4, -8);
  ctx.quadraticCurveTo(-22, -7, -28, -2);
  ctx.lineTo(-28, 3);
  ctx.quadraticCurveTo(-8, 8, 14, 6);
  ctx.quadraticCurveTo(26, 4, 28, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.fillRect(-14, 1, 30, 2.5);
  // Canopy, lit from the sunset.
  ctx.fillStyle = '#8fd8ff';
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.quadraticCurveTo(14, -13, 2, -12);
  ctx.lineTo(-2, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(4, -11, 5, 2);
  // Wing.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(-12, 16);
  ctx.lineTo(-4, 17);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();
  // Nav lights: red port, green starboard, blinking white tail.
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(-8, 16, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4dff88';
  ctx.beginPath();
  ctx.arc(8, 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-29, -4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Exhaust puffs at high throttle.
  if (throttle > 0.6) {
    ctx.fillStyle = 'rgba(200,200,200,0.5)';
    ctx.beginPath();
    ctx.arc(-30 - Math.random() * 6, 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
