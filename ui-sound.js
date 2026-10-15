(() => {
  'use strict';
  const key = 'pk-ui-sound-v1';
  const controls = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="submit"], input[type="button"]';
  let enabled = true, audio = null, unlocked = false, lastHover = -Infinity;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch {}

  function sync() {
    const toggle = document.getElementById('uiSoundToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.textContent = enabled ? 'เสียงปุ่มและเมนู: เปิด' : 'เสียงปุ่มและเมนู: ปิด';
    }
    const checkbox = document.getElementById('uiSoundEnabled');
    if (checkbox) checkbox.checked = enabled;
  }
  function arm() {
    if (!enabled) return;
    unlocked = true;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio ||= new Context();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch {}
  }
  // Original early-2000s game-menu timbre: filtered bleeps plus a short bass hit.
  // Envelope levels are 200% of the previous UI sound profile; no audio assets load.
  function synthesizeMenuSound(context, kind) {
    const volume = 2, now = context.currentTime;
    function note(type, from, to, delay, duration, level, cutoff) {
      const start = now + delay;
      const tone = context.createOscillator(), gain = context.createGain(), filter = context.createBiquadFilter();
      tone.type = type;
      tone.frequency.setValueAtTime(from, start);
      tone.frequency.exponentialRampToValueAtTime(to, start + duration * .75);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, start); filter.Q.setValueAtTime(.7, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(level * volume, start + .003);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      tone.connect(filter); filter.connect(gain); gain.connect(context.destination);
      tone.onended = () => { tone.disconnect(); filter.disconnect(); gain.disconnect(); };
      tone.start(start); tone.stop(start + duration + .005);
    }
    if (kind === 'hover') note('square', 1040, 520, 0, .045, .018, 1800);
    else {
      note('square', 520, 390, 0, .05, .028, 1600);
      note('square', 780, 1040, .055, .07, .028, 1800);
      note('triangle', 130, 65, 0, .10, .012, 500);
    }
  }
  function play(kind) {
    if (!enabled || !unlocked || document.hidden || !audio || audio.state !== 'running') return;
    try { synthesizeMenuSound(audio, kind); } catch {}
  }
  function control(event) {
    const el = event.target.closest?.(controls);
    return el && !el.matches(':disabled') && !el.closest('[inert], [hidden], [aria-disabled="true"]') ? el : null;
  }
  function setEnabled(value) {
    enabled = value;
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch {}
    sync();
    if (enabled) { arm(); play('click'); }
  }
  document.addEventListener('pointerdown', event => { if (event.isTrusted) arm(); }, {capture: true, passive: true});
  document.addEventListener('keydown', event => {
    if (event.isTrusted && (event.key === 'Enter' || event.key === ' ')) arm();
  }, true);
  document.addEventListener('pointerover', event => {
    if (!event.isTrusted || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = control(event);
    if (!el || el.contains(event.relatedTarget) || el.closest('[data-ui-sound-control]')) return;
    const now = performance.now();
    if (now - lastHover < 80) return;
    lastHover = now; play('hover');
  }, {passive: true});
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    const el = control(event);
    if (!el || el.closest('[data-ui-sound-control]')) return;
    arm(); play('click');
  }, true);
  document.getElementById('uiSoundToggle')?.addEventListener('click', () => setEnabled(!enabled));
  document.getElementById('uiSoundEnabled')?.addEventListener('change', event => setEnabled(event.target.checked));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      try { enabled = localStorage.getItem(key) !== 'off'; } catch {}
      sync();
    }
  });
  sync();
})();
