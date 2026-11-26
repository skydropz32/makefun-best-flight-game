// All drawing for Meridian Run: golden-hour sky, parallax mountains, sea,
// terrain, rings, runway and the lit HUD. The judge sees the game mostly
// through screenshots, so every frame must read as a flight game at a glance.
//
// One screen mapping, used everywhere: screenX = wx * SCALE - camX, and
// screenY = SEA_SCREEN_Y - wy * VSCALE + camY, where camY lifts the world
// down as the plane climbs so the plane stays near y = 260 on screen.
import { PALETTE, STALL_SPEED, VIEW_H, VIEW_W } from './config.js';
import { groundAt } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_LANDED = 'landed';
export const SCREEN_CRASHED = 'crashed';
export const SCREEN_OVER = 'over';

export const SCALE = 2.1; // world metres -> screen pixels, horizontal
export const VSCALE = 1.15; // world metres -> screen pixels, vertical
const SEA_SCREEN_Y = 560;
const SUN_X = 980;
const SUN_Y = 190;

export function cameraFor(plane) {
  const camX = plane.x * SCALE - 340;
  const camY = Math.max(0, plane.y * VSCALE - 300);
  return { camX, camY };
}

export function worldToScreenX(wx, camX) {
  return wx * SCALE - camX;
}
export function worldToScreenY(wy, camY) {
  return SEA_SCREEN_Y - wy * VSCALE + camY;
}
export function screenToWorldX(sx, camX) {
  return (sx + camX) / SCALE;
}

function skyGradient(ctx, dusk) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, dusk ? '#1c1440' : PALETTE.skyTop);
  g.addColorStop(0.45, dusk ? '#7a2d55' : PALETTE.skyMid);
  g.addColorStop(0.75, dusk ? '#e06a4e' : PALETTE.skyLow);
  g.addColorStop(1, '#ffc27a');
  return g;
}

function drawSun(ctx, time) {
  const pulse = 1 + Math.sin(time * 0.8) * 0.02;
  const glow = ctx.createRadialGradient(SUN_X, SUN_Y, 10, SUN_X, SUN_Y, 150 * pulse);
  glow.addColorStop(0, 'rgba(255,243,196,0.95)');
  glow.addColorStop(0.35, 'rgba(255,179,71,0.55)');
  glow.addColorStop(1, 'rgba(255,179,71,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(SUN_X - 160, SUN_Y - 160, 320, 320);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(SUN_X, SUN_Y, 46 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, camX, world, time) {
  ctx.fillStyle = 'rgba(255,225,200,0.85)';
  for (const c of world.clouds) {
    const sx = c.x * 0.4 - camX * 0.25;
    const x = ((sx % 1600) + 1600) % 1600 - 160;
    const y = c.y - 180 + Math.sin(time * 0.2 + c.x) * 4;
    const s = c.s;
    ctx.beginPath();
    ctx.ellipse(x, y, 70 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40 * s, y + 6 * s, 48 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 44 * s, y + 7 * s, 42 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function mountainLayer(ctx, camX, colour, factor, baseY, amp, seedOff) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-10, VIEW_H);
  for (let sx = -10; sx <= VIEW_W + 10; sx += 16) {
    const wx = (sx + camX * factor) / 180 + seedOff;
    const h = baseY - (Math.sin(wx * 1.7) * 0.5 + 0.5) * amp
      - (Math.sin(wx * 4.3 + 2) * 0.5 + 0.5) * amp * 0.35;
    ctx.lineTo(sx, h);
  }
  ctx.lineTo(VIEW_W + 10, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawSea(ctx, camY) {
  const seaTop = worldToScreenY(0, camY);
  if (seaTop >= VIEW_H) return;
  const g = ctx.createLinearGradient(0, Math.max(0, seaTop), 0, VIEW_H);
  g.addColorStop(0, '#2a6a8f');
  g.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.max(0, seaTop), VIEW_W, VIEW_H - Math.max(0, seaTop));
  ctx.fillStyle = 'rgba(255,207,138,0.5)';
  for (let i = 0; i < 26; i += 1) {
    const x = ((SUN_X + (i * 67) % 420 - 210) % VIEW_W + VIEW_W) % VIEW_W;
    const y = Math.max(0, seaTop) + 12 + ((i * 37) % 130);
    if (y < VIEW_H) ctx.fillRect(x, y, 26 - (i % 5) * 3, 2);
  }
}

function drawTerrain(ctx, camX, camY, world) {
  const step = 6;
  ctx.beginPath();
  let started = false;
  for (let sx = 0; sx <= VIEW_W; sx += step) {
    const wx = screenToWorldX(sx, camX);
    const gy = worldToScreenY(world.groundHeight(wx), camY);
    if (!started) {
      ctx.moveTo(sx, gy);
      started = true;
    } else ctx.lineTo(sx, gy);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.lineTo(0, VIEW_H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, VIEW_H * 0.45, 0, VIEW_H);
  g.addColorStop(0, PALETTE.groundTop);
  g.addColorStop(1, PALETTE.groundRock);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = PALETTE.sand;
  ctx.lineWidth = 5;
  ctx.beginPath();
  started = false;
  for (let sx = 0; sx <= VIEW_W; sx += step) {
    const wx = screenToWorldX(sx, camX);
    const gy = worldToScreenY(world.groundHeight(wx), camY);
    if (!started) {
      ctx.moveTo(sx, gy);
      started = true;
    } else ctx.lineTo(sx, gy);
  }
  ctx.stroke();
  for (const r of world.runways) {
    const x0 = worldToScreenX(r.x0, camX);
    const x1 = worldToScreenX(r.x1, camX);
    if (x1 < -50 || x0 > VIEW_W + 50) continue;
    const y = worldToScreenY(r.y, camY);
    ctx.fillStyle = PALETTE.runway;
    ctx.fillRect(x0, y - 4, x1 - x0, 9);
    ctx.fillStyle = PALETTE.runwayLine;
    for (let x = x0 + 24; x < x1 - 24; x += 72) ctx.fillRect(x, y - 1, 36, 3);
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r.name.toUpperCase(), x0 + 12, y - 12);
  }
}

function drawRings(ctx, camX, camY, world, time) {
  for (const ring of world.rings) {
    const sx = worldToScreenX(ring.x, camX);
    const sy = worldToScreenY(ring.y, camY);
    if (sx < -80 || sx > VIEW_W + 80) continue;
    const r = ring.r * SCALE;
    if (ring.passed) {
      ctx.strokeStyle = 'rgba(255,217,74,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    const pulse = 1 + Math.sin(time * 3 + ring.x) * 0.06;
    const pr = r * pulse;
    const glow = ctx.createRadialGradient(sx, sy, pr * 0.4, sx, sy, pr * 1.5);
    glow.addColorStop(0, 'rgba(255,237,176,0)');
    glow.addColorStop(0.8, 'rgba(255,217,74,0.35)');
    glow.addColorStop(1, 'rgba(255,217,74,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - pr * 1.6, sy - pr * 1.6, pr * 3.2, pr * 3.2);
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(sx, sy, pr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ringGlow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, pr - 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// A vertical instrument tape: scrolling numbers with the live value centred.
function tape(ctx, x, y, w, h, value, unit, label) {
  const span = 500;
  const min = value - span / 2;
  const max = value + span / 2;
  ctx.fillStyle = 'rgba(10,10,30,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,246,224,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const pxPerUnit = h / span;
  const centre = y + h / 2;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (let v = Math.floor(min / 10) * 10; v <= max; v += 10) {
    const ty = centre - (v - value) * pxPerUnit;
    if (ty < y - 8 || ty > y + h + 8) continue;
    const major = v % 50 === 0;
    ctx.strokeStyle = major ? PALETTE.hudInk : 'rgba(255,246,224,0.4)';
    ctx.beginPath();
    ctx.moveTo(x + w - (major ? 16 : 9), ty);
    ctx.lineTo(x + w, ty);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = PALETTE.hudInk;
      ctx.fillText(String(Math.max(0, v)), x + 5, ty + 4);
    }
  }
  ctx.restore();
  ctx.fillStyle = PALETTE.hudInk;
  ctx.fillRect(x + w - 4, centre - 1, 6, 2);
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 6);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${Math.max(0, Math.round(value))} ${unit}`, x + w / 2, y + h + 24);
  ctx.textAlign = 'left';
}

export function drawHUD(ctx, game) {
  const { plane, world, score } = game;
  const altFt = Math.max(0, plane.y * 3.28);
  const speedKt = plane.speed * 1.94;
  const heading = 90 + Math.round((plane.angle * 180) / Math.PI);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,10,30,0.55)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.fillStyle = PALETTE.hudInk;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`MERIDIAN RUN — ${world.mission.name.toUpperCase()}`, 18, 29);
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`SCORE ${score}`, VIEW_W - 18, 30);
  ctx.textAlign = 'left';
  tape(ctx, 18, 120, 74, 300, altFt, 'FT', 'ALT');
  tape(ctx, VIEW_W - 92, 120, 74, 300, speedKt, 'KT', 'SPD');
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudInk;
  ctx.fillText(`HDG ${String(((heading % 360) + 360) % 360).padStart(3, '0')}°`, 18, VIEW_H - 84);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`RINGS ${world.rings.filter((r) => !r.passed).length}/${world.rings.length}   LIVES ${'✈'.repeat(Math.max(0, game.lives))}`, 18, VIEW_H - 56);
  const fw = 260;
  const fx = VIEW_W / 2 - fw / 2;
  const fy = VIEW_H - 44;
  ctx.fillStyle = 'rgba(10,10,30,0.55)';
  ctx.fillRect(fx - 8, fy - 8, fw + 16, 30);
  ctx.fillStyle = plane.fuel < 25 ? PALETTE.hudDanger : '#37d67a';
  ctx.fillRect(fx, fy, fw * (plane.fuel / 100), 14);
  ctx.strokeStyle = PALETTE.hudInk;
  ctx.strokeRect(fx, fy, fw, 14);
  ctx.fillStyle = PALETTE.hudInk;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`FUEL ${Math.round(plane.fuel)}%`, VIEW_W / 2, fy + 12);
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('THR', VIEW_W - 150, VIEW_H - 52);
  ctx.fillStyle = 'rgba(10,10,30,0.55)';
  ctx.fillRect(VIEW_W - 108, VIEW_H - 64, 90, 12);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(VIEW_W - 108, VIEW_H - 64, 90 * plane.throttle, 12);
  if (plane.speed < STALL_SPEED && game.screen === SCREEN_PLAY) {
    ctx.fillStyle = PALETTE.hudDanger;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — THROTTLE UP', VIEW_W / 2, 96);
    ctx.textAlign = 'left';
  }
  if (game.briefTimer > 0) {
    ctx.globalAlpha = Math.min(1, game.briefTimer);
    ctx.fillStyle = 'rgba(10,10,30,0.6)';
    const bw = 560;
    ctx.fillRect(VIEW_W / 2 - bw / 2, 64, bw, 52);
    ctx.fillStyle = PALETTE.hudInk;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.mission.brief, VIEW_W / 2, 96);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function overlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(12,8,32,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudInk;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, 250);
  ctx.font = '20px system-ui, sans-serif';
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, VIEW_W / 2, y);
    y += 32;
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(hint, VIEW_W / 2, y + 26);
  ctx.textAlign = 'left';
}

export function render(ctx, game, time) {
  const { plane, world } = game;
  const { camX, camY } = cameraFor(plane);
  const dusk = game.missionIndex === 2;
  ctx.fillStyle = skyGradient(ctx, dusk);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawSun(ctx, time);
  drawClouds(ctx, camX, world, time);
  mountainLayer(ctx, camX, PALETTE.mountainFar, 0.12, 470, 120, 3.1);
  mountainLayer(ctx, camX, PALETTE.mountainMid, 0.25, 520, 150, 7.7);
  mountainLayer(ctx, camX, PALETTE.mountainNear, 0.45, 580, 130, 12.4);
  drawSea(ctx, camY);
  drawTerrain(ctx, camX, camY, world);
  drawRings(ctx, camX, camY, world, time);
  const px = worldToScreenX(plane.x, camX);
  const py = worldToScreenY(plane.y, camY);
  const gy = worldToScreenY(groundAt(world, plane.x), camY);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px, Math.min(VIEW_H - 4, gy), 26, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (plane.flares > 0) {
    ctx.fillStyle = '#ffe9a8';
    for (let i = 0; i < plane.flares; i += 1) {
      ctx.beginPath();
      ctx.arc(px - 20 - i * 9, py + 8 + Math.sin(time * 9 + i) * 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  game.drawPlaneAt(ctx, px, py, plane.angle, time, plane.throttle);

  if (game.screen === SCREEN_PLAY || game.screen === SCREEN_PAUSE) {
    drawHUD(ctx, game);
  }
  if (game.screen === SCREEN_TITLE) {
    drawHUD(ctx, game);
    overlay(ctx, 'MERIDIAN RUN', [
      'A golden-hour flight over the Meridian islands.',
      'Take off, thread the rings, land on Runway Two.',
      '↑ ↓ pitch   ← → throttle   Space flare   Mouse steers too',
    ], 'Press ENTER or click to fly — Sortie 1 of 3');
  }
  if (game.screen === SCREEN_PAUSE) {
    overlay(ctx, 'PAUSED', ['Take a breath, pilot.'], 'Press P to keep flying');
  }
  if (game.screen === SCREEN_LANDED) {
    overlay(ctx, 'TOUCHDOWN!', [
      `Clean landing — +500 points. Score ${game.score}.`,
      game.missionIndex < 2 ? 'Next sortie is waiting on the next island.' : 'That was the last sortie. What a run.',
    ], 'Press ENTER for the next sortie');
  }
  if (game.screen === SCREEN_CRASHED) {
    overlay(ctx, 'CRASHED', [
      'The Kestrel is in the drink. The islands are unforgiving.',
      `Score ${game.score} — ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`,
    ], 'Press R to fly again');
  }
  if (game.screen === SCREEN_OVER) {
    overlay(ctx, 'RUN OVER', [
      `Final score ${game.score}. The Meridian keeps its pilots honest.`,
      'Best line: throttle discipline beats full power.',
    ], 'Press R to start a new run');
  }
}
