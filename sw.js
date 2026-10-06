/* ─────────────────────────────────────────────────────────────────────────────
   Service worker — offline λειτουργία και ενημερώσεις για το «Κοινωνικές καταστάσεις».
   Στην εγκατάσταση αποθηκεύει τη σελίδα, τον κώδικα, τα κείμενα, τις
   γραμματοσειρές και τις εικόνες των κατηγοριών. Οι εικόνες των ιστοριών
   (δεκάδες MB) αποθηκεύονται όταν ανοίγει η κάθε ιστορία, οπότε offline
   ανοίγουν οι ιστορίες που έχουν ήδη προβληθεί. Η σελίδα ζητείται πρώτα από το δίκτυο, ώστε μια
   νέα έκδοση να φαίνεται αμέσως, και από την αποθήκη όταν δεν υπάρχει σύνδεση.
   Το VERSION και τις εκδόσεις της λίστας τα γράφει το scripts/set_release_version.py
   σε κάθε δημοσίευση, μαζί με το version.json της ειδοποίησης.
   ───────────────────────────────────────────────────────────────────────────── */
const VERSION = 'koinonikes-20261006.1';
const CACHE = `synoida-koinonikes-${VERSION}`;
const RUNTIME = 'synoida-koinonikes-runtime';
const NETWORK_WAIT_MS = 4000;

const ASSETS = [
  './',
  'index.html',
  'styles/app.css?v=20261006.1',
  'styles/shared-ui.css?v=20261006.1',
  'styles/cards-3d.css?v=20261006.1',
  'src/app.js?v=20261006.1',
  'src/engine.js?v=20261006.1',
  'src/preload.js?v=20261006.1',
  'src/updates.js?v=20261006.1',
  'data/scenarios.json?v=20261006.1',
  'assets/logo.webp',
  'assets/fonts/Comfortaa.woff2',
  'assets/fonts/Inter.woff2',
  'assets/categories/small/place-home.webp',
  'assets/categories/small/place-park.webp',
  'assets/categories/small/place-school.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'no-cache' → πάντα επαλήθευση με τον server, όχι από την HTTP cache.
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('synoida-koinonikes-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.cache === 'no-store' || req.cache === 'reload') return;
  if (req.mode === 'navigate') {
    // Δίκτυο πρώτα, με όριο αναμονής· αλλιώς η αποθηκευμένη σελίδα.
    e.respondWith(
      Promise.race([fetch(req), timeout(NETWORK_WAIT_MS)])
        .then((res) => (res && res.ok ? res : Promise.reject(new Error('offline'))))
        .catch(() => caches.match('index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
