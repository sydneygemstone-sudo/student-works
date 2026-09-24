// Safari's visible area can change without changing the layout viewport.
// Keep the game and its HUD inside that visible area, including the keyboard.
export function syncViewport() {
  const shell = document.getElementById('game-shell');
  const viewport = window.visualViewport;
  const width = Math.max(1, viewport?.width || window.innerWidth);
  const height = Math.max(1, viewport?.height || window.innerHeight);
  shell.style.width = `${width}px`;
  shell.style.height = `${height}px`;
  shell.style.left = `${viewport?.offsetLeft || 0}px`;
  shell.style.top = `${viewport?.offsetTop || 0}px`;
  shell.style.setProperty('--game-height', `${height}px`);
  shell.classList.toggle('short-viewport', height < 540);
  shell.classList.toggle('narrow-viewport', width < 600);
  shell.classList.toggle('touch-ui', navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches);
  return { width, height };
}

export function watchViewport(onResize) {
  const update = () => onResize(syncViewport());
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  update();
}
