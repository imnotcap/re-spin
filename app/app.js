/* re:spin — app-skal: router, overgange, sheets, toasts, handlinger */
(function () {
  const root = document.getElementById('app');
  const TABS = ['home', 'search', 'inbox', 'profile'];
  const App = (window.App = {
    state: { favs: new Set([2, 4]), ui: {}, filters: { cond: new Set(), max: 2000, sort: 'new' } },
    stack: [], scroll: {}, cur: null
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build(hash) {
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    let name = parts[0] || 'welcome', params = parts.slice(1);
    // sammensatte routes: sell/success, order/success, profile/edit
    if (Screens[name + '/' + params[0]]) { name = name + '/' + params[0]; params = params.slice(1); }
    const scr = (Screens[name] || Screens.notfound)(params);
    const el = document.createElement('div');
    el.className = 'screen ' + (scr.cls || '');
    el.innerHTML = scr.html + (scr.tab ? UI.tabbar(scr.tab) : '');
    const c = el.querySelector('.content'); if (c && scr.tab) c.classList.add('content--tabs');
    return { el, scr, name };
  }

  function show(anim) {
    const hash = location.hash || '#/welcome';
    const { el, scr } = build(hash);
    const old = root.querySelector('.screen');
    if (old) { App.scroll[App.cur] = (old.querySelector('.content') || {}).scrollTop || 0; }
    el.classList.add('enter-' + anim);
    root.appendChild(el);
    if (old) { if (reduce || anim === 'fade') old.remove(); else setTimeout(() => old.remove(), 340); }
    const c = el.querySelector('.content');
    if (c) c.scrollTop = anim === 'pop' ? App.scroll[hash] || 0 : 0;
    App.cur = hash; scr.mount && scr.mount(el);
    const af = el.querySelector('[data-autofocus]'); if (af) af.focus({ preventScroll: true });
    closeSheet(true);
  }

  App.rerender = () => {
    const old = root.querySelector('.screen'), top = (old.querySelector('.content') || {}).scrollTop || 0;
    const { el, scr } = build(location.hash);
    root.replaceChild(el, old);
    const c = el.querySelector('.content'); if (c) c.scrollTop = top;
    scr.mount && scr.mount(el);
  };

  const isTab = (h) => TABS.includes((h || '').replace(/^#\//, '').split('/')[0]);
  window.addEventListener('hashchange', () => {
    const h = location.hash, prev = App.cur, st = App.stack;
    let anim = 'push';
    if (st.length > 1 && st[st.length - 2] === h) { st.pop(); anim = 'pop'; }
    else if (isTab(h)) { App.stack = [h]; anim = 'fade'; }
    else st.push(h);
    if (!isTab(h) && isTab(prev) === false && anim === 'push' && /success/.test(h)) anim = 'fade';
    show(anim);
  });

  /* ---- Toast ---- */
  App.toast = (msg, icon = 'check') => {
    root.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = UI.icon(icon, 18) + UI.esc(msg); root.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 240); }, 2200);
  };

  /* ---- Sheets ---- */
  function openSheet(name, id) {
    closeSheet(true);
    const w = document.createElement('div'); w.id = 'sheetHost'; w.innerHTML = Sheets[name](id); root.appendChild(w);
    const max = w.querySelector('#max');
    if (max) max.addEventListener('input', () => { App.state.filters.max = +max.value; w.querySelector('#maxLbl').textContent = +max.value >= 2000 ? 'Ingen grænse' : UI.kr(+max.value); });
  }
  function closeSheet(now) {
    const w = document.getElementById('sheetHost'); if (!w) return;
    const done = () => { w.remove(); if (w.dataset.dirty) App.rerender(); };
    if (now || reduce) return done();
    w.firstChild.classList.add('closing'); w.querySelector('.sheet').classList.add('closing'); setTimeout(done, 230);
    App.rerender();
  }
  const dirtyFilter = () => { const w = document.getElementById('sheetHost'); if (w) { w.innerHTML = Sheets.filter(); w.querySelectorAll('.sheet,.backdrop').forEach((n) => (n.style.animation = 'none')); const m = w.querySelector('#max'); m.addEventListener('input', () => { App.state.filters.max = +m.value; w.querySelector('#maxLbl').textContent = +m.value >= 2000 ? 'Ingen grænse' : UI.kr(+m.value); }); } };

  /* ---- Actions ---- */
  const A = {
    back() { App.stack.length > 1 ? history.back() : (location.hash = '#/home'); },
    fav(el) {
      const id = +el.dataset.id, s = App.state.favs, on = !s.has(id);
      on ? s.add(id) : s.delete(id);
      document.querySelectorAll('.fav[data-id="' + id + '"]').forEach((b) => { b.setAttribute('aria-pressed', on); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
      App.toast(on ? 'Gemt i favoritter' : 'Fjernet fra favoritter', on ? 'heart' : 'close');
      if (/favorites/.test(location.hash) && !on) setTimeout(App.rerender, 350);
    },
    toast(el) { App.toast(el.dataset.msg || 'Kommer snart', 'info'); },
    'share-do'(el) { closeSheet(); App.toast(el.dataset.msg || 'Gjort'); },
    sheet(el) { openSheet(el.dataset.sheet, el.dataset.id); },
    'close-sheet'() { closeSheet(); },
    'toggle-chip'(el) { el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true'); },
    'clear-recent'() { document.getElementById('recent').innerHTML = '<span class="t-small t-muted">Ingen seneste søgninger</span>'; },
    follow(el) { App.state.ui['follow' + el.dataset.id] = !App.state.ui['follow' + el.dataset.id]; App.rerender(); },
    'quick-cond'(el) { const c = App.state.filters.cond, v = el.dataset.value; c.has(v) ? c.delete(v) : c.add(v); App.rerender(); },
    'quick-price'() { const f = App.state.filters; f.max = f.max === 300 ? 2000 : 300; App.rerender(); },
    'reset-filters'() { App.state.filters = { cond: new Set(), max: 2000, sort: 'new' }; document.getElementById('sheetHost') ? (closeSheet(true), App.rerender()) : App.rerender(); },
    'sheet-sort'(el) { App.state.filters.sort = el.dataset.value; dirtyFilter(); },
    'sheet-cond'(el) { const c = App.state.filters.cond, v = el.dataset.value; c.has(v) ? c.delete(v) : c.add(v); dirtyFilter(); },
    'offer-pct'(el) { const it = DATA.items.find((i) => i.id == document.querySelector('[data-action="send-offer"]').dataset.id); document.getElementById('offerAmt').value = Math.round(it.price * (1 - el.dataset.value / 100)); },
    'send-offer'(el) { const id = el.dataset.id; closeSheet(true); App.toast('Bud sendt til sælger'); location.hash = '#/chat/i' + id; },
    seg: tabSet, tab: tabSet, utab: (el) => tabSet(el, 'utab'), ptab: (el) => tabSet(el, 'ptab'), ftab: (el) => tabSet(el, 'ftab'), otab: (el) => tabSet(el, 'otab')
  };
  function tabSet(el, key) { App.state.ui[key || el.dataset.action] = el.dataset.value; App.rerender(); }

  document.addEventListener('click', (e) => {
    const inp = e.target.closest('input[data-href]'); if (inp) { location.hash = inp.dataset.href; return; }
    const a = e.target.closest('[data-action]'); if (!a || !A[a.dataset.action]) return;
    if (a.tagName === 'A' && a.dataset.action !== 'back') e.preventDefault();
    A[a.dataset.action](a);
  });

  /* ---- Formularer ---- */
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    const kind = f.dataset.form;
    if (kind === 'login') location.hash = '#/home';
    if (kind === 'signup') location.hash = '#/interests';
    if (kind === 'profile') { App.toast('Profil gemt'); A.back(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  /* ---- Start ---- */
  if (!location.hash) location.hash = '#/welcome';
  App.stack = [location.hash];
  show('fade');
})();
