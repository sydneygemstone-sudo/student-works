// Keep the whole game in the visible viewport, including Safari's browser chrome,
// keyboard and a page that was already pinch-zoomed before the game opened.
export function installDisplay({ onResize, onInterrupt }) {
  const root = document.getElementById('gameViewport');
  const buttons = [...document.querySelectorAll('[data-fullscreen]')];
  const help = document.getElementById('fullscreenHelp');
  const viewport = window.visualViewport;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const fullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  let frame = 0;
  let dimensions = { width: innerWidth, height: innerHeight, scale: 1 };

  function fit() {
    frame = 0;
    const scale = Math.max(1, viewport?.scale || 1);
    const width = Math.round((viewport?.width || innerWidth) * scale);
    const height = Math.round((viewport?.height || innerHeight) * scale);
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.transform = `translate(${viewport?.offsetLeft || 0}px, ${viewport?.offsetTop || 0}px) scale(${1 / scale})`;
    const changed = width !== dimensions.width || height !== dimensions.height;
    dimensions = { width, height, scale };
    if (changed) onResize(dimensions);
  }
  function scheduleFit() { if (!frame) frame = requestAnimationFrame(fit); }
  function updateButtons() {
    const active = !!fullscreen() || standalone();
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? 'Exit fullscreen / 退出全屏' : 'Fullscreen / 全屏');
      button.title = active ? 'Exit fullscreen / 退出全屏' : 'Fullscreen / 全屏';
      button.querySelector('.screen-label').textContent = active ? 'EXIT FULLSCREEN / 退出全屏' : 'FULLSCREEN / 全屏';
    }
    onInterrupt();
    scheduleFit();
  }
  async function enter({ explainFailure = true } = {}) {
    document.activeElement?.blur();
    if (standalone() || fullscreen()) return;
    const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    try {
      if (!request) throw new Error('Fullscreen unavailable');
      // Keep this call in the originating tap/click: Safari requires user activation.
      await request.call(document.documentElement);
      help.hidden = true;
    } catch {
      if (explainFailure) help.hidden = false;
    }
    updateButtons();
  }
  async function toggle() {
    if (standalone()) {
      document.getElementById('fullscreenHelpText').textContent = 'Already playing without browser bars. / 当前已经是无地址栏模式。';
      help.hidden = false;
      return;
    }
    if (fullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { await exit.call(document); } catch { help.hidden = false; }
      updateButtons();
    } else await enter();
  }
  for (const button of buttons) button.addEventListener('click', toggle);
  document.getElementById('closeFullscreenHelp').addEventListener('click', () => { help.hidden = true; });
  document.addEventListener('fullscreenchange', updateButtons);
  document.addEventListener('webkitfullscreenchange', updateButtons);
  addEventListener('resize', () => { onInterrupt(); scheduleFit(); });
  addEventListener('orientationchange', () => { onInterrupt(); scheduleFit(); });
  addEventListener('pageshow', scheduleFit);
  viewport?.addEventListener('resize', scheduleFit);
  viewport?.addEventListener('scroll', scheduleFit);

  // Safari may ignore user-scalable=no. Cancel its gesture defaults without
  // stopping propagation, so the joystick and attack still receive both fingers.
  const cancel = event => { if (event.cancelable) event.preventDefault(); };
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, cancel, { passive: false });
  }
  root.addEventListener('touchmove', event => {
    if (event.touches.length > 1 || event.target.closest?.('#world, #controls')) cancel(event);
  }, { passive: false });
  // Combat controls already act on pointerdown/up; they need no synthetic click.
  document.getElementById('controls').addEventListener('touchend', cancel, { passive: false });
  root.addEventListener('dblclick', event => {
    if (!event.target.closest?.('input, textarea, [contenteditable]')) cancel(event);
  }, { passive: false });
  root.addEventListener('contextmenu', event => {
    if (event.target.closest?.('#world, #controls')) cancel(event);
  });
  fit();
  onResize(dimensions);
  updateButtons();
  return { enter, getSize: () => dimensions };
}
