import { shuffleChoices, findChoice, nextScene } from './engine.js';

const main = document.querySelector('main');
const settings = document.querySelector('#settings');
const e = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const paths = {
  home:'M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10',
  school:'M3 21V9l9-6 9 6v12H3ZM9 21v-6h6v6M7 10h.01M17 10h.01M12 8h.01',
  outside:'M12 3 5 12h4l-5 6h7v4h2v-4h7l-5-6h4L12 3Z',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  refresh:'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  next:'M4 12h16m-6-6 6 6-6 6',
  back:'M20 12H4m6-6-6 6 6 6',
  picture:'M4 4h16v16H4V4Zm0 12 5-5 4 4 3-3 4 4M15 8h.01',
  review:'M6 3h12v18H6V3Zm3 5h6M9 12h6M9 16h4',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${name==='settings'?'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>':`<path d="${paths[name] || paths.picture}"/>`}</svg>`;
const theme = {home:['#8dc63f','#f3f8e9','#547f1a'],school:['#00aeef','#edf9fe','#08779f'],outside:['#f7941d','#fff4e7','#986011']};
const color = category => {const t=theme[category];return `--accent:${t[0]};--soft:${t[1]};--accent-dark:${t[2]}`;};
const button = (action, label, cls='', symbol='', extra='') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${symbol?icon(symbol):''}${e(label)}</button>`;
const media = (text, kind='scene', src=null, large=null) => src
  ? `<button type="button" class="scene-media with-art" data-media="${kind}" data-action="zoom" data-src="${e(large||src)}" data-caption="${e(text)}" aria-label="Μεγέθυνση: ${e(text)}"><img src="${e(src)}" alt="${e(text)}" decoding="async" width="320" height="320"><span class="zoom-hint" aria-hidden="true">⤢</span></button>`
  : `<div class="scene-media" data-media="${kind}" role="img" aria-label="${e(text)}. Η εικόνα δεν έχει δημιουργηθεί ακόμη."><div class="media-mark">${icon('picture')}</div><span>Η εικόνα θα προστεθεί</span></div>`;
const editorialMode = ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
const categoryImages = {home:'place-home',school:'place-school',outside:'place-park'};
let bank, scene, layout = [], selected = null, route = 'home', category = null;
const previousLayouts = new Map();
const preferences = {feedback:false, notes:false, large:false};

function categoryLabel(id) { return bank.categories.find(c=>c.id===id)?.label || ''; }
function toolbar(extra='') {
  return `<nav class="toolbar" aria-label="Χειρισμοί"><div class="toolbar-start">${button('home','Αρχική','neutral home-btn','home','id="home"')}${button('settings','Ρυθμίσεις','neutral settings-btn','settings')}</div><div class="toolbar-end">${extra}</div></nav>`;
}
function go(hash) {
  
  if(location.hash===`#${hash}`) loadRoute();
  else location.hash=hash;
}
function showHome() {
  main.innerHTML=`<section class="home"><h1>Τι μπορώ να κάνω;</h1><p class="home-sub">Μικρές ιστορίες. Διαφορετικές επιλογές.</p><p class="section-label">Πού θα πάμε σήμερα;</p><div class="categories">${bank.categories.map(c=>`<button class="category" data-action="category" data-category="${c.id}"><img class="category-image" src="assets/categories/small/${categoryImages[c.id]}.webp" alt="" width="320" height="320"><strong>${e(c.label)}</strong><small>${bank.scenes.filter(s=>s.category===c.id).length} καταστάσεις</small></button>`).join('')}</div></section>`;
}
function tile(s, i) {
  return `<button class="story-tile" style="${color(s.category)}" data-action="scene" data-id="${s.id}"><small>Ιστορία ${String(i+1).padStart(2,'0')}</small><strong>${e(s.title)}</strong></button>`;
}
function renderCategoryTiles() {
  const scenes=bank.scenes.filter(s=>s.category===category);
  document.querySelector('#story-grid').innerHTML=scenes.map((s,i)=>tile(s,i)).join('');
}
function showCategory() {
  main.innerHTML=toolbar(button('random','Τυχαία κατάσταση','new','refresh'))+`<h1 class="page-title">${e(categoryLabel(category))}</h1><p class="eyebrow">Διάλεξε μια ιστορία για να ξεκινήσουμε.</p><div id="story-grid" class="story-grid"></div>`;
  renderCategoryTiles();
}
function notes(s) {
  return `<aside class="notes"><h2>Για τον θεραπευτή</h2><p><strong>Στόχος:</strong> ${e(s.goal)}</p><p>${e(s.teacherNote)}</p>${s.rankReview?'<p class="review-flag">Η διαβάθμιση των δύο αποδεκτών λύσεων χρειάζεται ειδική συζήτηση πριν οριστικοποιηθεί.</p>':''}${s.safetyNote?`<p>${e(s.safetyNote)}</p>`:''}<p><strong>Συζήτηση:</strong> ${e(s.discussionPrompt)}</p><p>Αρχές: ${s.sourcePrinciples.join(', ')}. Πρωτότυπο προσχέδιο προς επιβεβαίωση.</p></aside>`;
}
function showScene() {
  const items=bank.scenes.filter(s=>s.category===category);
  main.innerHTML=toolbar(button('category','Καταστάσεις','neutral','back',`data-category="${category}"`)+button('next','Νέα κατάσταση','new','refresh'))+
    `<h1 class="page-title">${e(scene.title)}</h1><p class="eyebrow">${e(categoryLabel(category))} · ${items.indexOf(scene)+1} / ${items.length}</p>`+
    (selected?outcomeMarkup():`<div class="scene-layout"><section>${media(scene.context,'scene',scene.sceneImage,scene.sceneLargeImage)}<p class="scene-context">${e(scene.context)}</p></section><section aria-labelledby="question"><h2 class="question" id="question">Τι μπορώ να κάνω;</h2><div class="choices">${layout.map((c,i)=>`<button class="choice" data-action="choose" data-choice="${c.id}"><span class="choice-num">${i+1}.</span><span>${e(c.text)}</span></button>`).join('')}</div></section></div>`)+
    (preferences.notes?notes(scene):'');
}
function outcomeMarkup() {
  const choice=findChoice(scene,selected);
  const feedback={1:'Αυτή η επιλογή βοηθά να βρούμε μια λύση.',2:'Αυτή είναι επίσης μια καλή επιλογή. Μπορεί να χρειαστεί κι ένα βήμα ακόμη.',3:'Έτσι μπορεί να γίνει πιο δύσκολο να τα βρούμε.',4:'Έτσι μπορεί κάποιος να πληγωθεί ή το πρόβλημα να μεγαλώσει.'};
  return `<div class="selected-answer"><small>Διάλεξα…</small>${e(choice.text)}</div><h2 class="outcome-title" tabindex="-1">Τι μπορεί να συμβεί;</h2><p class="outcome-sub">Δύο διαφορετικές συνέχειες. Μπορεί να γίνει κι αλλιώς.</p><div class="outcomes">${choice.outcomes.map((o,i)=>`<article class="outcome" data-outcome="${o.id}"><h3>${i===0?'Ένα ενδεχόμενο':'Ένα άλλο ενδεχόμενο'}</h3>${media(o.text,'outcome',o.image,o.largeImage)}<p>${e(o.text)}</p></article>`).join('')}</div>${preferences.feedback?`<p class="feedback">${e(scene.rankReview&&choice.rank<=2?'Αυτή είναι μια αποδεκτή επιλογή. Ας συζητήσουμε πότε βοηθά.':feedback[choice.rank])}</p>`:''}${choice.rank===4 && scene.safetyNote?'<p class="safety-line">Αν κινδυνεύει κάποιος, ζητάμε βοήθεια. Το χτύπημα δεν είναι λύση.</p>':''}<div class="outcome-actions">${button('retry','Δοκίμασε άλλη επιλογή','neutral','back')}${button('next','Επόμενη κατάσταση','new','next')}</div>`;
}
function renderReviewList() {
  const filter=document.querySelector('#review-category').value;
  const filtered=bank.scenes.filter(s=>!filter||s.category===filter);
  document.querySelector('#review-count').textContent=`${filtered.length} καταστάσεις · ${filtered.length*4} επιλογές · ${filtered.length*8} εκβάσεις`;
  document.querySelector('#review-list').innerHTML=filtered.map(s=>`<details class="review-item" data-review-id="${s.id}"><summary>${e(s.id)} · ${e(s.title)}</summary><div class="review-body"><p>${e(s.context)}</p><p class="review-goal"><strong>Στόχος:</strong> ${e(s.goal)}</p>${s.choices.map(c=>`<section class="review-choice"><strong>Βαθμίδα ${c.rank} · ${e(c.text)}</strong><ul>${c.outcomes.map(o=>`<li>${e(o.text)}</li>`).join('')}</ul></section>`).join('')}<p class="review-goal">${e(s.teacherNote)}</p>${s.rankReview?'<p class="review-flag">Ειδικός έλεγχος της διαβάθμισης των δύο αποδεκτών λύσεων.</p>':''}${button('scene','Δοκίμασε την κατάσταση','neutral','next',`data-id="${s.id}"`)}</div></details>`).join('')||'<p class="empty">Δεν βρέθηκε κάποια ιστορία.</p>';
}
function showReview() {
  main.innerHTML=toolbar(`<a class="btn neutral" href="docs/CONTENT-REVIEW.md" download>Λήψη κειμένων</a>`)+`<h1 class="page-title">Έλεγχος περιεχομένου</h1><div class="draft-note">Τοπικός χώρος επιμέλειας. Δεν εμφανίζεται στην τελική εφαρμογή. Ελέγχουμε τις καταστάσεις, τις επιλογές, τις εκβάσεις και τις αντίστοιχες εικόνες. Η κατάταξη εδώ φαίνεται για επιμέλεια· στο παιχνίδι οι απαντήσεις ανακατεύονται.</div><div class="filter-row"><label for="review-category">Κατηγορία</label><select id="review-category"><option value="">Όλες οι κατηγορίες</option>${bank.categories.map(c=>`<option value="${c.id}">${e(c.label)}</option>`).join('')}</select></div><p id="review-count" class="review-count" role="status"></p><div id="review-list"></div>`;
  renderReviewList();
}
function loadRoute() {
  selected=null;
  const parts=location.hash.slice(1).split('/');
  route=parts[0]||'home';
  if(route==='category'&&bank.categories.some(c=>c.id===parts[1])) {category=parts[1];showCategory();}
  else if(route==='scene'&&(scene=bank.scenes.find(s=>s.id===parts[1]))) {
    category=scene.category;layout=shuffleChoices(scene.choices,previousLayouts.get(scene.id));
    previousLayouts.set(scene.id,layout.map(c=>c.id));showScene();
  } else if(route==='review' && editorialMode) showReview();
  else {route='home';showHome();}
  window.scrollTo(0,0);main.focus({preventScroll:true});
}
main.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target)return;
  const action=target.dataset.action;
  if(action==='zoom'){
    document.querySelector('#picture-large').src=target.dataset.src;
    document.querySelector('#picture-large').alt=target.dataset.caption;
    document.querySelector('#picture-caption').textContent=target.dataset.caption;
    document.querySelector('#picture-dialog').showModal();
  }
  else if(action==='home')go('home');
  else if(action==='settings'){document.body.classList.add('drawer-open');settings.showModal();}
  else if(action==='category')go(`category/${target.dataset.category}`);
  else if(action==='scene')go(`scene/${target.dataset.id}`);
  else if(action==='review')go('review');
  else if(action==='random'||action==='next'){
    const s=nextScene(bank.scenes.filter(s=>s.category===category),action==='next'?scene.id:null);go(`scene/${s.id}`);
  } else if(action==='choose'){
    selected=target.dataset.choice;findChoice(scene,selected);showScene();
    document.querySelector('.outcome-title').focus({preventScroll:true});window.scrollTo(0,0);
  } else if(action==='retry'){
    const prior=selected;selected=null;showScene();document.querySelector(`[data-choice="${prior}"]`).focus({preventScroll:true});
  }
});
main.addEventListener('change',event=>{if(event.target.id==='review-category')renderReviewList();});
document.querySelector('#close-settings').onclick=()=>settings.close();
document.querySelector('#close-picture').onclick=()=>document.querySelector('#picture-dialog').close();
document.querySelector('#picture-dialog').addEventListener('close',()=>{
  const picture=document.querySelector('#picture-large');
  picture.removeAttribute('src');picture.alt='';
  document.querySelector('#picture-caption').textContent='';
});
document.querySelector('#close-settings-x').onclick=()=>settings.close();
settings.addEventListener('close',()=>document.body.classList.remove('drawer-open'));
document.querySelector('.skip').onclick=event=>{event.preventDefault();main.focus();};
settings.addEventListener('click',event=>{if(event.target===settings&&event.clientX<settings.getBoundingClientRect().left)settings.close();});
for(const [id,key] of [['show-feedback','feedback'],['show-notes','notes'],['large-text','large']]){
  document.getElementById(id).addEventListener('change',event=>{
    preferences[key]=event.target.checked;document.body.classList.toggle('large-text',preferences.large);
    if(route==='scene'&&scene)showScene();
  });
}
window.addEventListener('hashchange',()=>{if(bank)loadRoute();});
try {
  const response=await fetch('data/scenarios.json?v=20260917-small-nospeech');if(!response.ok)throw new Error('Δεν βρέθηκαν τα κείμενα.');
  bank=await response.json();if(!Array.isArray(bank.scenes)||!bank.categories.every(c=>bank.scenes.filter(s=>s.category===c.id).length===c.count))throw new Error('Η τράπεζα περιεχομένου είναι ελλιπής.');
  loadRoute();
} catch(error) {
  main.innerHTML=`<section class="error"><h1>Δεν άνοιξαν οι ιστορίες</h1><p>Ανανέωσε τη σελίδα και δοκίμασε ξανά.</p><p>${e(error.message)}</p></section>`;
}
