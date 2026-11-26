// Meridian Run — game loop, states and sorties. Wires input, physics,
// rendering and sound together; the game object is what render.js draws.
import { KEYS, MOUSE, bindInput, pitchInput, throttleInput } from './input.js';
import { buildWorld, ringsLeft } from './world.js';
import { drawPlane, makePlane, resetPlane, ringsPassed, stepPlane } from './plane.js';
import { render, SCREEN_CRASHED, SCREEN_LANDED, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { playClick, playCrash, playRing, playThud, toggleMute, unlockAudio, updateEngine } from './audio.js';
import { LIVES_START, STEP } from './config.js';

export function makeGame(canvas) {
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || 1);
  const shot = params.get('shot');

  const game = {
    canvas,
    ctx,
    seed,
    missionIndex: 0,
    world: buildWorld(seed, 0),
    plane: makePlane(),
    screen: SCREEN_TITLE,
    score: 0,
    lives: LIVES_START,
    time: 0,
    briefTimer: 0,
    shake: 0,
    drawPlaneAt: drawPlane,
  };

  bindInput(canvas);

  game.newRun = function newRun() {
    game.missionIndex = 0;
    game.world = buildWorld(game.seed, 0);
    resetPlane(game.plane, game.world.runways[0]);
    game.plane.fuel = game.world.mission.fuel;
    game.score = 0;
    game.lives = LIVES_START;
    game.screen = SCREEN_TITLE;
    game.briefTimer = 0;
  };

  game.nextSortie = function nextSortie() {
    game.missionIndex += 1;
    game.world = buildWorld(game.seed, game.missionIndex);
    resetPlane(game.plane, game.world.runways[0]);
    game.plane.fuel = game.world.mission.fuel;
    game.screen = SCREEN_TITLE;
    game.briefTimer = 5;
  };

  // One fixed physics step. Returns the event stepPlane reported, if any.
  game.step = function step(dt, pitch, throttleDelta) {
    const event = stepPlane(game.plane, dt, pitch, throttleDelta, game.world, game.world.mission.wind);
    if (event === 'ring') {
      game.score += 150;
      playRing();
    }
    if (event === 'landed') {
      game.score += 500;
      playThud();
      game.screen = SCREEN_LANDED;
    }
    if (event === 'crashed') {
      game.lives -= 1;
      game.shake = 0.5;
      playCrash();
      game.screen = game.lives > 0 ? SCREEN_CRASHED : SCREEN_OVER;
    }
    return event;
  };

  function startFlying() {
    unlockAudio();
    playClick();
    game.screen = SCREEN_PLAY;
    game.briefTimer = 5;
  }

  function handleKeys() {
    if (KEYS.m) {
      KEYS.m = false;
      toggleMute();
    }
    if (game.screen === SCREEN_TITLE && (KEYS.enter || MOUSE.clicked)) {
      KEYS.enter = false;
      MOUSE.clicked = false;
      startFlying();
      return;
    }
    if (game.screen === SCREEN_PLAY && KEYS.p) {
      KEYS.p = false;
      game.screen = SCREEN_PAUSE;
      return;
    }
    if (game.screen === SCREEN_PAUSE && KEYS.p) {
      KEYS.p = false;
      game.screen = SCREEN_PLAY;
      return;
    }
    if (game.screen === SCREEN_LANDED && KEYS.enter) {
      KEYS.enter = false;
      if (game.missionIndex < 2) game.nextSortie();
      else game.newRun();
      startFlying();
      return;
    }
    if ((game.screen === SCREEN_CRASHED || game.screen === SCREEN_OVER) && KEYS.r) {
      KEYS.r = false;
      game.newRun();
      startFlying();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (game.lastNow || now)) / 1000 || STEP);
    game.lastNow = now;
    game.time += dt;
    if (game.briefTimer > 0) game.briefTimer -= dt;
    if (game.shake > 0) game.shake -= dt;
    handleKeys();
    if (game.screen === SCREEN_PLAY) {
      let acc = (game.acc || 0) + dt;
      while (acc >= STEP) {
        game.step(STEP, pitchInput(), throttleInput());
        acc -= STEP;
        if (game.screen !== SCREEN_PLAY) break;
      }
      game.acc = acc;
      if (MOUSE.clicked) {
        MOUSE.clicked = false;
        game.plane.flares = 8; // a click pops a flare burst
        playClick();
      }
      updateEngine(game.plane.throttle, game.plane.speed);
    } else if (game.screen === SCREEN_TITLE) {
      // Idle drift on the title screen: the plane sits on the runway.
      game.plane.throttle = 0.25 + Math.sin(game.time * 0.7) * 0.05;
    }
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * game.shake * 24, (Math.random() - 0.5) * game.shake * 24);
    }
    render(ctx, game, game.time);
    ctx.restore();
  }

  // Screenshot mode: stage the named scene once, then keep rendering it.
  if (shot) {
    game.newRun();
    stageShot(shot, game);
    render(ctx, game, game.time);
    return game;
  }

  game.newRun();
  requestAnimationFrame(frame);
  return game;
}

// Expose for the playtest driver: the game's live state in one object.
export function gameState(game) {
  return {
    screen: game.screen,
    score: game.score,
    lives: game.lives,
    x: Math.round(game.plane.x),
    y: Math.round(game.plane.y),
    speed: Math.round(game.plane.speed * 10) / 10,
    fuel: Math.round(game.plane.fuel),
    ringsLeft: ringsLeft(game.world),
    ringsPassed: ringsPassed(game.world),
  };
}
