/* Shared classroom game gesture guard. Loaded before first interaction. */
(()=>{'use strict';
 const owned='canvas,#stickZone,#joystick,#touchBtns,#btnFire,#btnIce,#btnJump,#fire,#ice,#jump,#attack,#skill';
 const editable='input,textarea,select,[contenteditable="true"]';
 const counts={nativeTouchDefaults:0,doubleClicks:0,nativeGestures:0};
 const el=e=>e.target instanceof Element?e.target:null;
 function gameplay(e){const t=el(e);return !!t&&!t.closest(editable)&&!t.closest('button,a')&&!!t.closest(owned);}
 function cancel(e,key){if(e.cancelable){e.preventDefault();counts[key]++;}}
 // Pointer handlers still receive their normal events; do not stop propagation.
 // Click-only menu/toolbar controls are excluded so a normal tap still activates once.
 for(const type of ['touchstart','touchmove','touchend'])document.addEventListener(type,e=>{
  if(gameplay(e))cancel(e,'nativeTouchDefaults');
 },{capture:true,passive:false});
 document.addEventListener('dblclick',e=>{const t=el(e);if(t&&!t.closest(editable))cancel(e,'doubleClicks');},{capture:true,passive:false});
 for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,e=>{
  if(gameplay(e))cancel(e,'nativeGestures');
 },{capture:true,passive:false});
 window.__classroomTouchGuard={version:'2026.09-r6-tap-safe',counts};
})();
