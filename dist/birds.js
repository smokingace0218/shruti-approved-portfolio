/* Decorative, route-local Vanta Birds. Core content never depends on WebGL. */
(() => {
  if (window.PortfolioBirds) return;
  const base = window.__PORTFOLIO_BASE__ || '';
  let dependencies;
  let currentCleanup;
  const script = file => new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = `${base}/vendor/${file}`;
    tag.onload = resolve;
    tag.onerror = reject;
    document.head.append(tag);
  });
  const load = () => dependencies ||= (async () => {
    if (!window.THREE) await script('three.min.js');
    if (!window.VANTA?.BIRDS) await script('vanta.birds.min.js');
  })();
  function capable() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
      if (!gl) return false;
      const supported = Boolean(gl.getExtension('OES_texture_float')) && gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return supported;
    } catch (_) { return false; }
  }
  function mount(scene) {
    currentCleanup?.();
    const layer = scene?.querySelector('.connect-birds');
    if (!layer) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let disposed = false;
    let failed = false;
    let checked = false;
    let effect;
    let generation = 0;
    let idleTask;
    let observer;
    let resize;
    const allowed = () => !disposed && !failed && visible && !document.hidden && !reduce.matches && scene.isConnected;
    const destroy = () => {
      generation++;
      if (idleTask) {
        if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleTask);
        else clearTimeout(idleTask);
        idleTask = 0;
      }
      if (effect) {
        const renderer = effect.renderer;
        renderer?.domElement?.removeEventListener('webglcontextlost', onContextLost);
        // Vanta removes its scene/listeners. Also release compute textures and GPU context.
        effect.gpuCompute?.variables?.forEach(variable => {
          variable.initialValueTexture?.dispose();
          variable.material?.dispose();
          variable.renderTargets?.forEach(target => target.dispose());
        });
        try { effect.destroy(); } catch (_) { /* Preserve the contact page on renderer failure. */ }
        renderer?.dispose();
        renderer?.forceContextLoss();
        effect = null;
      }
      layer.replaceChildren();
      layer.style.background = 'transparent';
    };
    const start = async () => {
      idleTask = 0;
      if (!allowed() || effect) return;
      if (!checked) { checked = true; if (!capable()) { failed = true; return; } }
      const token = ++generation;
      try {
        await load();
        if (token !== generation || !allowed()) return;
        const css = getComputedStyle(scene);
        const color = (name, fallback) => parseInt(css.getPropertyValue(name).trim().replace('#', ''), 16) || fallback;
        const mobile = window.matchMedia('(max-width: 760px)').matches;
        effect = window.VANTA.BIRDS({
          el: layer, THREE: window.THREE,
          backgroundAlpha: 0, backgroundColor: color('--paper', 0xf5f1e9),
          color1: color('--terracotta', 0xb9644b), color2: color('--moss', 0x87907a), colorMode: 'varianceGradient',
          birdSize: 1.2, wingSpan: 34, speedLimit: 4,
          separation: 20, alignment: 20, cohesion: 20,
          quantity: mobile ? 2 : 4, scale: 1.5, scaleMobile: 2,
          minHeight: 200, minWidth: 200,
          mouseControls: true, touchControls: false, gyroControls: false
        });
        if (!effect?.renderer?.domElement?.parentNode || !effect.scene || !(effect.birdUniforms || effect.birds?.length)) {
          failed = true; destroy(); return;
        }
        effect.renderer.domElement.setAttribute('aria-hidden', 'true');
        effect.renderer.domElement.addEventListener('webglcontextlost', onContextLost, { once: true });
      } catch (_) {
        if (!effect && window.VANTA?.current?.el === layer) effect = window.VANTA.current;
        failed = true; destroy();
      }
    };
    const queue = () => {
      if (!allowed() || effect || idleTask) return;
      idleTask = 'requestIdleCallback' in window ? window.requestIdleCallback(start, { timeout: 1600 }) : setTimeout(start, 150);
    };
    function onContextLost() { failed = true; destroy(); }
    const sync = () => { if (allowed()) queue(); else destroy(); };
    const hide = () => { visible = false; destroy(); };
    const show = event => {
      if (!event.persisted || !scene.isConnected) return;
      const rect = scene.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight;
      sync();
    };
    const followPointer = event => {
      if (!effect || !allowed() || event.pointerType === 'touch') return;
      const rect = layer.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      effect.onMouseMove?.(x, y);
      layer.style.setProperty('--birds-shift-x', `${(x - .5) * 16}px`);
      layer.style.setProperty('--birds-shift-y', `${(y - .5) * 12}px`);
    };
    const cleanup = () => {
      disposed = true; destroy(); observer?.disconnect(); resize?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      window.removeEventListener('pointermove', followPointer);
      reduce.removeEventListener('change', sync);
    };
    currentCleanup = cleanup;
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    window.addEventListener('pointermove', followPointer, { passive: true });
    reduce.addEventListener('change', sync);
    if ('ResizeObserver' in window) {
      resize = new ResizeObserver(() => effect?.resize());
      resize.observe(layer);
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      observer.observe(scene);
    } else { visible = true; sync(); }
    return cleanup;
  }
  window.PortfolioBirds = { mount };
})();
