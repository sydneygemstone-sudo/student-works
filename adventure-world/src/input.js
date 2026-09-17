/**
 * Adventure World - Unified Desktop & Touch Input Controller
 * Clean lifecycle handling with zero-stuck keys and multi-touch support.
 */

export class InputController {
  constructor(canvasElement, callbacks = {}) {
    this.canvas = canvasElement;
    this.callbacks = callbacks; // { onInteract, onFly, onInvis, onTorch, onAvatar, onPause, onResume }

    // Axes
    this.moveX = 0;
    this.moveY = 0;

    // Raw key tracking
    this.keys = new Map();

    // Virtual Joystick state
    this.joystick = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      radius: 54
    };

    // Action button state
    this.activePointers = new Map();

    this.initKeyboard();
    this.initLifecycle();
  }

  initKeyboard() {
    window.addEventListener("keydown", (e) => {
      // Prevent scrolling on arrows / space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat) return; // Prevent key-repeat bounce
      this.keys.set(e.code, true);

      // Triggers
      if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
        if (this.callbacks.onInteract) this.callbacks.onInteract();
      } else if (e.code === "KeyF") {
        if (this.callbacks.onFly) this.callbacks.onFly();
      } else if (e.code === "KeyI") {
        if (this.callbacks.onInvis) this.callbacks.onInvis();
      } else if (e.code === "KeyL") {
        if (this.callbacks.onTorch) this.callbacks.onTorch();
      } else if (e.code === "Digit1") {
        if (this.callbacks.onAvatar) this.callbacks.onAvatar("avatar-1");
      } else if (e.code === "Digit2") {
        if (this.callbacks.onAvatar) this.callbacks.onAvatar("avatar-2");
      } else if (e.code === "Digit3") {
        if (this.callbacks.onAvatar) this.callbacks.onAvatar("avatar-3");
      } else if (e.code === "Escape") {
        if (this.callbacks.onPause) this.callbacks.onPause();
      }

      this.updateMovementVector();
    });

    window.addEventListener("keyup", (e) => {
      this.keys.set(e.code, false);
      this.updateMovementVector();
    });
  }

  initLifecycle() {
    const clearAll = () => {
      this.keys.clear();
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      this.activePointers.clear();
    };

    window.addEventListener("blur", clearAll);
    window.addEventListener("visibilitychange", () => {
      if (document.hidden) clearAll();
    });
    window.addEventListener("pagehide", clearAll);
    window.addEventListener("orientationchange", clearAll);
  }

  updateMovementVector() {
    // Keyboard vector
    let kx = 0;
    let ky = 0;

    if (this.keys.get("KeyW") || this.keys.get("ArrowUp")) ky -= 1;
    if (this.keys.get("KeyS") || this.keys.get("ArrowDown")) ky += 1;
    if (this.keys.get("KeyA") || this.keys.get("ArrowLeft")) kx -= 1;
    if (this.keys.get("KeyD") || this.keys.get("ArrowRight")) kx += 1;

    // If keyboard is pressed, it overrides or merges
    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      this.moveX = kx / len;
      this.moveY = ky / len;
    } else if (!this.joystick.active) {
      this.moveX = 0;
      this.moveY = 0;
    }
  }

  // Virtual Joystick handlers (called from DOM container)
  bindJoystickElement(containerEl, knobEl) {
    if (!containerEl) return;

    const onPointerDown = (e) => {
      if (this.joystick.active) return;
      this.joystick.active = true;
      this.joystick.pointerId = e.pointerId;
      const rect = containerEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      this.joystick.startX = centerX;
      this.joystick.startY = centerY;
      this.handleJoystickMove(e.clientX, e.clientY, knobEl);
      containerEl.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (this.joystick.active && this.joystick.pointerId === e.pointerId) {
        this.handleJoystickMove(e.clientX, e.clientY, knobEl);
        e.preventDefault();
      }
    };

    const onPointerUp = (e) => {
      if (this.joystick.pointerId === e.pointerId) {
        this.joystick.active = false;
        this.joystick.pointerId = null;
        this.moveX = 0;
        this.moveY = 0;
        if (knobEl) {
          knobEl.style.transform = "translate(0px, 0px)";
        }
      }
    };

    containerEl.addEventListener("pointerdown", onPointerDown, { passive: false });
    containerEl.addEventListener("pointermove", onPointerMove, { passive: false });
    containerEl.addEventListener("pointerup", onPointerUp);
    containerEl.addEventListener("pointercancel", onPointerUp);
    containerEl.addEventListener("lostpointercapture", onPointerUp);
  }

  handleJoystickMove(clientX, clientY, knobEl) {
    const dx = clientX - this.joystick.startX;
    const dy = clientY - this.joystick.startY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = this.joystick.radius;

    let clampedDist = Math.min(dist, maxRadius);
    let angle = Math.atan2(dy, dx);

    const nx = dist > 0 ? (clampedDist / maxRadius) * Math.cos(angle) : 0;
    const ny = dist > 0 ? (clampedDist / maxRadius) * Math.sin(angle) : 0;

    this.moveX = nx;
    this.moveY = ny;

    if (knobEl) {
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;
      knobEl.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }
  }

  // Clear inputs manually when pausing or showing dialogs
  reset() {
    this.keys.clear();
    this.moveX = 0;
    this.moveY = 0;
    this.joystick.active = false;
    this.joystick.pointerId = null;
  }
}
