// Keep only the current story's decoded display images; never preload zoom assets.
export function createScenePreloader() {
  let sceneId = null, ready = new Map(), cancel = () => {};
  function pause() { cancel(); cancel = () => {}; }
  function clear() { pause(); ready.clear(); sceneId = null; }
  function start(scene, visibleImage) {
    pause();
    if (sceneId !== scene.id) { ready.clear(); sceneId = scene.id; }
    const connection = navigator.connection;
    if (!visibleImage || connection?.saveData || ['slow-2g','2g'].includes(connection?.effectiveType)) return;
    const queue = [...new Set(scene.choices.flatMap(c => c.outcomes.map(o => o.image)))]
      .filter(src => src && !ready.has(src));
    let cancelled = false, timer, active = new Set();
    function pump() {
      if (cancelled) return;
      while (active.size < 2 && queue.length) {
        const src = queue.shift(), img = new Image();
        img.decoding = 'async';
        img.fetchPriority = 'low';
        let settled = false, timeout;
        const job = { abort() { finish(false); img.removeAttribute('src'); } };
        function finish(ok) {
          if (settled) return;
          settled = true; clearTimeout(timeout);
          img.onload = img.onerror = null; active.delete(job);
          if (ok && !cancelled) ready.set(src, img);
          if (!cancelled) pump();
        }
        img.onload = async () => {
          try { await img.decode(); } catch { /* The visible image can retry normally. */ }
          finish(img.naturalWidth > 0);
        };
        img.onerror = () => finish(false);
        active.add(job);
        timeout = setTimeout(() => job.abort(), 12000);
        img.src = src;
      }
    }
    function begin() {
      visibleImage.removeEventListener('load', begin);
      // Yield so the current image is painted before background work begins.
      if (!cancelled && visibleImage.naturalWidth) timer = setTimeout(pump, 100);
    }
    cancel = () => {
      cancelled = true; clearTimeout(timer); queue.length = 0;
      visibleImage.removeEventListener('load', begin);
      for (const job of [...active]) job.abort();
    };
    if (visibleImage.complete && visibleImage.naturalWidth) begin();
    else visibleImage.addEventListener('load', begin, {once:true});
  }
  return {start, pause, clear};
}
