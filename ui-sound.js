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
  function play(kind) {
    if (!enabled || !unlocked || document.hidden || !audio || audio.state !== 'running') return;
    try {
      const hover = kind === 'hover', now = audio.currentTime;
      const tone = audio.createOscillator(), gain = audio.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(hover ? 880 : 660, now);
      tone.frequency.exponentialRampToValueAtTime(hover ? 1100 : 990, now + .025);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(hover ? .018 : .04, now + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, now + (hover ? .035 : .065));
      tone.connect(gain); gain.connect(audio.destination);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      tone.start(now); tone.stop(now + (hover ? .04 : .07));
    } catch {}
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
