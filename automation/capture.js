/* Records only clicked element selectors and page paths after manual portal login.
   Never records input values, passwords, cookies, or response bodies. */
(function () {
  function cssPath(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    var bits = [];
    while (el && el.nodeType === 1 && bits.length < 12) {
      if (el.id) {
        bits.unshift('#' + CSS.escape(el.id));
        break;
      }
      var tag = el.tagName.toLowerCase();
      var index = 1;
      var sibling = el;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName === el.tagName) index += 1;
      }
      bits.unshift(tag + ':nth-of-type(' + index + ')');
      el = el.parentElement;
    }
    return bits.join(' > ');
  }
  document.addEventListener('click', function (event) {
    var t = event.target;
    if (!(t instanceof Element)) return;
    var el = t.closest('a,button,input[type="submit"],input[type="button"],[onclick],[role="button"]') || t;
    if (el.closest('input[type="password"],[autocomplete="current-password"]')) return;
    try {
      if (typeof window.__otsRecordClick === 'function') {
        window.__otsRecordClick({
          path: window.location.pathname,
          selector: cssPath(el)
        }).catch(function () {});
      }
    } catch (_) {}
  }, true);
}());
