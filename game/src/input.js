// Keyboard + mouse for Meridian Run. The plane answers to both: arrows (or
// WASD) for pitch and throttle, the mouse as a flight stick (its height steers
// the climb), a click for a flare burst, and buttons on the menus.
export const KEYS = {
  up: false,
  down: false,
  left: false,
  right: false,
  space: false,
  enter: false,
  p: false,
  m: false,
  r: false,
};

const KEY_MAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'space',
  Enter: 'enter',
  KeyP: 'p',
  KeyM: 'm',
  KeyR: 'r',
};

export const MOUSE = {
  x: 0,
  y: 0,
  inside: false,
  clicked: false, // set on mousedown, cleared by the game after it reads it
  down: false,
};

export function bindInput(canvas) {
  window.addEventListener('keydown', (event) => {
    const name = KEY_MAP[event.code];
    if (name) {
      KEYS[name] = true;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    const name = KEY_MAP[event.code];
    if (name) KEYS[name] = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    MOUSE.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    MOUSE.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    MOUSE.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    MOUSE.inside = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      MOUSE.clicked = true;
      MOUSE.down = true;
    }
  });
  window.addEventListener('mouseup', () => {
    MOUSE.down = false;
  });
  // Losing focus must never leave a key stuck down.
  window.addEventListener('blur', () => {
    for (const key of Object.keys(KEYS)) KEYS[key] = false;
    MOUSE.down = false;
  });
}

// Pitch the pilot asks for: -1 (dive) .. 1 (climb). Keyboard wins over the
// mouse stick; no input means hold level.
export function pitchInput() {
  if (KEYS.up) return 1;
  if (KEYS.down) return -1;
  if (MOUSE.inside) {
    const centre = 0.5;
    const norm = (MOUSE.y / 720 - centre) * 2; // -1 top .. 1 bottom
    if (Math.abs(norm) > 0.12) return -Math.max(-1, Math.min(1, norm));
  }
  return 0;
}

// Throttle the pilot asks for: -1 (idle) .. 1 (full). Keyboard only.
export function throttleInput() {
  if (KEYS.right) return 1;
  if (KEYS.left) return -1;
  return 0;
}
