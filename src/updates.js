// Independent from the activity runtime: a failed check never blocks a story.
const current = document.querySelector('meta[name="app-version"]').content;
const notice = document.querySelector('#update-notice');
const status = document.querySelector('#update-status');
const refresh = document.querySelector('#refresh-app');
const apply = document.querySelector('#apply-update');
let latest = current, dismissed = null, lastCheck = 0, checking = false, refreshing = false;
let requestNumber = 0;
const valid = version => typeof version === 'string' && /^\d{8}\.\d{1,4}$/.test(version);
const newer = (a, b) => {
  const [ad, an] = a.split('.').map(Number), [bd, bn] = b.split('.').map(Number);
  return ad > bd || (ad === bd && an > bn);
};
function freshUrl(path) {
  const url = new URL(path, location.href);
  url.searchParams.set('_check', `${Date.now()}-${++requestNumber}`);
  return url;
}
async function request(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {cache:'no-store', credentials:'same-origin', signal:controller.signal});
    if (!response.ok) throw new Error('network');
    return await response.text();
  } finally { clearTimeout(timeout); }
}
async function getVersion() {
  const data = JSON.parse(await request(freshUrl('version.json')));
  if (!valid(data.version)) throw new Error('version');
  return data.version;
}
function showAvailable(version) {
  if (!newer(version, current)) return;
  latest = version;
  status.textContent = 'Υπάρχει νεότερη έκδοση. Πάτησε «Ανανέωση εφαρμογής» όταν είσαι έτοιμος.';
  if (dismissed !== version) notice.hidden = false;
}
async function check(force=false) {
  if (checking || refreshing || document.hidden || (!force && Date.now()-lastCheck < 60000)) return;
  checking = true; lastCheck = Date.now();
  try { showAvailable(await getVersion()); }
  catch { /* Offline/startup failures must not interrupt the activity. */ }
  finally { checking = false; }
}
async function refreshApp(event) {
  event.preventDefault();
  if (refreshing) return;
  refreshing = true; refresh.setAttribute('aria-disabled','true'); apply.disabled = true;
  status.textContent = 'Ελέγχουμε τη σύνδεση και τη νεότερη έκδοση…';
  notice.querySelector('p').textContent = status.textContent;
  try {
    const remote = await getVersion();
    const wanted = newer(remote, current) ? remote : current;
    const destination = new URL(location.href);
    destination.searchParams.set('v', wanted);
    destination.searchParams.set('_refresh', `${Date.now()}-${++requestNumber}`);
    // Verify that the new document is deployed before leaving a working session.
    const html = await request(destination);
    const available = new DOMParser().parseFromString(html,'text/html').querySelector('meta[name="app-version"]')?.content;
    if (available !== wanted) throw new Error('deploying');
    location.replace(destination.href);
  } catch(error) {
    const message = error.message === 'deploying'
      ? 'Η ενημέρωση δεν είναι ακόμη έτοιμη. Δοκίμασε ξανά σε λίγο.'
      : 'Δεν έγινε ανανέωση. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.';
    status.textContent = message;
    notice.querySelector('p').textContent = message;
    refreshing = false; refresh.removeAttribute('aria-disabled'); apply.disabled = false;
  }
}
refresh.addEventListener('click', refreshApp);
apply.addEventListener('click', refreshApp);
document.querySelector('#dismiss-update').addEventListener('click', () => {
  dismissed = latest; notice.hidden = true;
  // Dismissing a notice must not leave keyboard focus on a hidden button.
  document.querySelector('main').focus({preventScroll:true});
});
window.addEventListener('pageshow', event => { if (event.persisted) check(true); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
window.addEventListener('online', () => check(true));
setTimeout(() => check(), 1500);
