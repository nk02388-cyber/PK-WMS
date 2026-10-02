(() => {
  if (window.parent === window) return;
  try {
    const host = window.parent.document.documentElement;
    const sync = () => { document.documentElement.dataset.theme = host.dataset.theme === 'dark' ? 'dark' : 'light'; };
    sync();
    new MutationObserver(sync).observe(host, {attributes:true, attributeFilter:['data-theme']});
  } catch (_) {}
})();
