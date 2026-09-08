import test from 'node:test';
import assert from 'node:assert/strict';

let installDrawerGesture;
try { ({installDrawerGesture} = await import('../src/drawer-gesture.js')); } catch {}

class Surface {
  constructor() { this.listeners = new Map(); this.captured = []; this.released = []; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener() {}
  setPointerCapture(id) { this.captured.push(id); }
  releasePointerCapture(id) { this.released.push(id); }
  emit(type, values = {}) {
    const event = {
      button: 0,
      pointerId: 7,
      clientX: 0,
      clientY: 0,
      target: {closest: () => null},
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
      ...values,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
}

test('drawer gesture controller is available', () => {
  assert.equal(typeof installDrawerGesture, 'function');
});

test('a cancelled Android edge swipe settles the drawer instead of leaving it half open', {skip: !installDrawerGesture}, () => {
  const surface = new Surface();
  let progress = 0;
  const settled = [];
  installDrawerGesture({
    surface,
    width: 292,
    getProgress: () => progress,
    applyProgress: value => { progress = value; },
    settle: open => settled.push(open),
    schedule: callback => { callback(); return 1; },
    cancelSchedule() {},
  });

  surface.emit('pointerdown', {clientX: 8, clientY: 200});
  const move = surface.emit('pointermove', {clientX: 130, clientY: 203});
  surface.emit('pointercancel', {clientX: 130, clientY: 203});

  assert.deepEqual(surface.captured, [7]);
  assert.equal(move.defaultPrevented, true);
  assert.equal(progress > 0.4, true);
  assert.deepEqual(settled, [true]);
});

test('drawer movement is coalesced to one visual update per animation frame', {skip: !installDrawerGesture}, () => {
  const surface = new Surface();
  let queued;
  const applied = [];
  installDrawerGesture({
    surface,
    width: 292,
    getProgress: () => applied.at(-1) || 0,
    applyProgress: value => applied.push(value),
    settle() {},
    schedule: callback => { queued = callback; return 1; },
    cancelSchedule() {},
  });

  surface.emit('pointerdown', {clientX: 8, clientY: 200});
  surface.emit('pointermove', {clientX: 70, clientY: 202});
  surface.emit('pointermove', {clientX: 130, clientY: 203});
  assert.equal(applied.length, 0);
  queued();
  assert.equal(applied.length, 1);
  assert.equal(applied[0] > 0.4, true);
});
