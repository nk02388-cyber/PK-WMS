(function () {
  'use strict';
  // Only retire obsolete UI caches. Auth, inventory, drafts and events are never cleared.
  function cleanup(local, session, now = new Date()) {
    const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const removed = [];
    function remove(storage, key) {
      try { if (storage.getItem(key) !== null) { storage.removeItem(key); removed.push(key); } } catch {}
    }
    remove(local, 'pk-sidebar-collapsed');
    for (const [storage, key] of [[local,'pk-notifications-dismissed-v1'],[session,'pk-notifications-toast-seen-v1']]) {
      try {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        let saved;
        try { saved = JSON.parse(raw); } catch { remove(storage,key); continue; }
        if (!saved || saved.day !== day || !Array.isArray(saved.signatures)) remove(storage,key);
      } catch {}
    }
    return removed;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {cleanup}; return; }
  let local, session;
  try { local = window.localStorage; } catch {}
  try { session = window.sessionStorage; } catch {}
  cleanup(local,session);
})();
