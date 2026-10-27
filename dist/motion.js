/* Locally packaged Lenis + GSAP. Keep scrolling native in geometry and accessibility. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const boundaries = new Set();
  const cleanups = [];
  let lenis = null;
  let ticker = null;
  let initialized = false;
  const nativeScroll = options => window.scrollTo(options);
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function scrollTo(first, second) {
    const options = typeof first === 'number' ? { left: first, top: second || 0 } : { ...first };
    const immediate = reduce.matches || options.behavior !== 'smooth';
    if (!lenis) { nativeScroll({ ...options, behavior: reduce.matches ? 'instant' : options.behavior }); return; }
    lenis.scrollTo(options.top ?? window.scrollY, { immediate, duration: .85, force: true });
  }
  function scrollIntoView(element, options = {}) {
    if (!element) return;
    if (!lenis) { element.scrollIntoView(options); return; }
    const rect = element.getBoundingClientRect();
    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const align = options.block === 'center' ? (window.innerHeight - rect.height) / 2 : options.block === 'end' ? window.innerHeight - rect.height : margin;
    scrollTo({ top: window.scrollY + rect.top - align, behavior: options.behavior });
  }
  function stopScroll() {
    if (lenis) lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  }
  function removeSmoothScroll() {
    if (ticker) gsap.ticker.remove(ticker);
    ticker = null;
    lenis?.destroy(); lenis = null;
  }
  function createSmoothScroll() {
    removeSmoothScroll();
    if (reduce.matches || !window.Lenis || !gsap || document.hidden) return;
    // Constructed after the scene handlers. Their preventDefault wins before Lenis.
    lenis = new window.Lenis({
      autoRaf: false, smoothWheel: true, syncTouch: false, lerp: .14,
      anchors: false, allowNestedScroll: true,
      virtualScroll: data => {
        if (data.event.defaultPrevented) { stopScroll(); return false; }
        if (data.event.ctrlKey || data.event.metaKey || Math.abs(data.deltaX) > Math.abs(data.deltaY)) return false;
        if (data.deltaY > 0) {
          const limits = [...boundaries].map(read => read()).filter(value => Number.isFinite(value));
          const limit = Math.min(...limits);
          if (Math.max(window.scrollY, lenis.targetScroll) + data.deltaY >= limit) {
            lenis.scrollTo(Math.max(0, limit), { immediate: true, force: true });
            if (data.event.cancelable) data.event.preventDefault();
            return false;
          }
        }
        return true;
      }
    });
    if (ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
    ticker = time => lenis?.raf(time * 1000);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(ticker);
  }
  function revealCards(cards) {
    if (!gsap || reduce.matches || !cards.length) return;
    cards.forEach(card => { gsap.killTweensOf(card); card.classList.add('is-gsap-revealing'); });
    gsap.fromTo(cards, { opacity: 0, y: 24, scale: .96 }, {
      opacity: 1, y: 0, scale: 1, duration: .55, stagger: .09, ease: 'power3.out', overwrite: true,
      onComplete: () => {
        gsap.set(cards, { clearProps: 'opacity,transform' });
        cards.forEach(card => card.classList.remove('is-gsap-revealing'));
      }
    });
  }
  function resetCards(cards) {
    if (!gsap) return;
    gsap.killTweensOf(cards);
    gsap.set(cards, { clearProps: 'opacity,transform' });
    cards.forEach(card => card.classList.remove('is-gsap-revealing'));
  }
  function crossfadeFrames(images, active) {
    if (!gsap) return;
    if (reduce.matches) { gsap.killTweensOf(images); gsap.set(images, { clearProps: 'opacity' }); return; }
    images.forEach(image => image.classList.add('is-gsap-frame'));
    gsap.to(images, { opacity: (_, image) => image.dataset.connectFrame === active ? 1 : 0, duration: .14, ease: 'none', overwrite: true });
  }
  function observeReveals(items) {
    if (!gsap || !ScrollTrigger || reduce.matches) return false;
    items.forEach(item => {
      const trigger = ScrollTrigger.create({ trigger: item, start: 'top 88%', once: true, onEnter: () => {
        item.classList.add('is-visible');
        item.classList.add('is-gsap-revealing');
        gsap.fromTo(item, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .65, ease: 'power2.out', clearProps: 'opacity,transform', onComplete: () => item.classList.remove('is-gsap-revealing') });
      } });
      cleanups.push(() => { trigger.kill(); gsap.killTweensOf(item); item.classList.add('is-visible'); gsap.set(item, { clearProps: 'opacity,transform' }); });
    });
    return true;
  }
  function init() {
    if (initialized) return;
    initialized = true;
    createSmoothScroll();
    const refresh = () => { lenis?.resize(); ScrollTrigger?.refresh(); };
    window.addEventListener('load', refresh, { once: true });
    document.fonts?.ready.then(refresh);
    document.addEventListener('click', event => {
      if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const target = new URL(link.href, location.href);
      if (target.origin !== location.origin || target.pathname !== location.pathname || target.search !== location.search || !target.hash) return;
      let element;
      try { element = document.getElementById(decodeURIComponent(target.hash.slice(1))); } catch (_) { return; }
      if (!element) return;
      event.preventDefault();
      history.pushState(history.state, '', target.hash);
      scrollIntoView(element, { behavior: 'smooth', block: 'start' });
      element.focus({ preventScroll: true });
    });
    window.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopScroll(); }, { capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) removeSmoothScroll(); else createSmoothScroll(); });
    window.addEventListener('pagehide', removeSmoothScroll);
    window.addEventListener('pageshow', event => { if (event.persisted) { createSmoothScroll(); refresh(); } });
    reduce.addEventListener('change', () => {
      createSmoothScroll();
      if (reduce.matches) cleanups.splice(0).forEach(cleanup => cleanup());
      refresh();
    });
    refresh();
  }
  window.PortfolioMotion = { init, scrollTo, scrollIntoView, stopScroll, revealCards, resetCards, crossfadeFrames, observeReveals, registerBoundary: read => { boundaries.add(read); return () => boundaries.delete(read); } };
})();
