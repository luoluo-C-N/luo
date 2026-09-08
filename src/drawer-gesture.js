export function installDrawerGesture({
  surface,
  width = 292,
  edgeWidth = 56,
  getProgress,
  applyProgress,
  settle,
  canStart = (event, progress) => progress > 0.002 || event.clientX < edgeWidth,
  onStart = () => {},
  onEnd = () => {},
  schedule = callback => requestAnimationFrame(callback),
  cancelSchedule = id => cancelAnimationFrame(id),
}) {
  let drag = null;
  let frame = 0;
  let pendingProgress = null;
  let suppressClick = false;

  function flushVisual() {
    if (pendingProgress === null) return;
    const value = pendingProgress;
    pendingProgress = null;
    applyProgress(value);
  }

  function queueVisual(value) {
    pendingProgress = Math.max(0, Math.min(1, value));
    if (frame) return;
    frame = -1;
    const id = schedule(() => {
      frame = 0;
      flushVisual();
    });
    if (frame === -1) frame = id;
  }

  function releasePointer() {
    if (!drag) return;
    try { surface.releasePointerCapture(drag.pointerId); } catch {}
  }

  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const progress = getProgress();
    if (!canStart(event, progress)) return;
    drag = {
      pointerId: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      p0: progress,
      axis: null,
      moved: false,
      samples: [{x: event.clientX, time: performance.now()}],
    };
    try { surface.setPointerCapture(event.pointerId); } catch {}
    onStart();
  }

  function pointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x0;
    const dy = event.clientY - drag.y0;
    if (!drag.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'y') {
        releasePointer();
        drag = null;
        onEnd();
        return;
      }
    }
    event.preventDefault();
    drag.moved = true;
    queueVisual(drag.p0 + dx / width);
    const now = performance.now();
    drag.samples.push({x: event.clientX, time: now});
    while (drag.samples.length > 6 || (drag.samples.length > 1 && now - drag.samples[0].time > 100)) drag.samples.shift();
  }

  function pointerEnd(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (frame > 0) cancelSchedule(frame);
    frame = 0;
    flushVisual();
    const finished = drag;
    releasePointer();
    drag = null;
    onEnd();
    if (finished.axis !== 'x') return;
    const samples = finished.samples;
    let velocity = 0;
    if (samples.length > 1) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      velocity = (last.x - first.x) / Math.max(1, last.time - first.time);
    }
    const progress = getProgress();
    const open = velocity > 0.35 ? true : velocity < -0.35 ? false : progress > 0.32;
    if (finished.moved) suppressClick = true;
    settle(open);
  }

  function click(event) {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  surface.addEventListener('pointerdown', pointerDown);
  surface.addEventListener('pointermove', pointerMove, {passive: false});
  surface.addEventListener('pointerup', pointerEnd);
  surface.addEventListener('pointercancel', pointerEnd);
  surface.addEventListener('click', click, true);

  return () => {
    if (frame > 0) cancelSchedule(frame);
    surface.removeEventListener('pointerdown', pointerDown);
    surface.removeEventListener('pointermove', pointerMove);
    surface.removeEventListener('pointerup', pointerEnd);
    surface.removeEventListener('pointercancel', pointerEnd);
    surface.removeEventListener('click', click, true);
  };
}
