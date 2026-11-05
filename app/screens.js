/* ==========================================================================
   re:spin — SKÆRME  (hver funktion returnerer {tab, cls, html, mount})
   Kun komponenter fra UI.* bruges – ingen ad-hoc styling pr. skærm.
   ========================================================================== */
(function () {
  const D = DATA, S = {}, esc = UI.esc, kr = UI.kr;
  const item = (id) => D.items.find((i) => i.id == id);
  const favs = () => App.state.favs;
  const ui = (k, d) => (App.state.ui[k] == null ? d : App.state.ui[k]);

  /* ======================= ONBOARDING ======================= */
  S.welcome = () => ({
    cls: 'screen--bleed screen--dark', html: `
    <div class="content" style="background:radial-gradient(80% 45% at 0% 100%, rgba(210,255,50,.30), transparent 70%), var(--grad-deep);color:var(--cream);display:flex;flex-direction:column">
            <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:calc(var(--safe-top) + 72px) var(--s-6) calc(var(--s-6) + var(--safe-bottom))">
        <div class="stack gap-6">
          ${UI.wordmark(40, 'var(--cream)')}
          <h1 class="t-display" style="font-size:40px;line-height:44px">Giv tøjet nyt liv.<br>Sælg nemt,<br>køb unikt.</h1>
          <p style="opacity:.75;max-width:280px">Brugt tøj, sko og boligting. Gratis at sælge, tryg at købe.</p>
        </div>
        <div class="stack gap-3">
          ${UI.btn({ label: 'Opret konto', size: 'lg', full: true, href: '#/signup' })}
          ${UI.btn({ label: 'Log ind', variant: 'ghost-inverse', size: 'lg', full: true, href: '#/login' })}
          <a href="#/home" class="t-center t-bold" style="padding:var(--s-3);opacity:.85">Se dig omkring som gæst</a>
        </div>
      </div>
    </div>`
  });

  S.login = () => ({
    html: `${UI.topbar({ title: '', back: true })}
    <div class="content content--footer"><div class="px stack gap-6">
      <div><h1 class="t-h1">Velkommen tilbage</h1><p class="t-muted mt-2">Log ind for at se dine beskeder og handler.</p></div>
      <div class="stack gap-3">
        ${UI.btn({ label: 'Fortsæt med Apple', variant: 'dark', full: true, icon: 'apple', action: 'toast', attr: { 'data-msg': 'Apple-login er ikke koblet på endnu' } })}
        ${UI.btn({ label: 'Fortsæt med Google', variant: 'outline', full: true, icon: 'google', action: 'toast', attr: { 'data-msg': 'Google-login er ikke koblet på endnu' } })}
      </div>
      <div class="row-flex gap-3 t-muted t-small"><hr class="divider grow" style="margin:0">eller<hr class="divider grow" style="margin:0"></div>
      <form class="form-stack" data-form="login">
        ${UI.field({ label: 'E-mail', id: 'email', type: 'email', placeholder: 'navn@mail.dk', icon: 'mail', required: true, autocomplete: 'email' })}
        ${UI.field({ label: 'Adgangskode', id: 'pw', type: 'password', placeholder: '••••••••', icon: 'lock', required: true, autocomplete: 'current-password' })}
        <a href="#/help" class="t-link t-small" style="align-self:flex-end">Glemt adgangskode?</a>
        ${UI.btn({ label: 'Log ind', size: 'lg', full: true, attr: { type: 'submit' } })}
      </form>
      <p class="t-center t-muted">Ny her? <a class="t-link" href="#/signup" style="color:var(--text)">Opret konto</a></p>
    </div></div>`
  });

  S.signup = () => ({
    html: `${UI.topbar({ title: UI.stepper(1, 2), back: true })}
    <div class="content content--footer"><div class="px stack gap-6">
      <div><h1 class="t-h1">Opret din konto</h1><p class="t-muted mt-2">Det tager under et minut. Det er gratis at sælge.</p></div>
      <form class="form-stack" data-form="signup">
        ${UI.field({ label: 'Fulde navn', id: 'name', placeholder: 'Fornavn Efternavn', icon: 'user', required: true })}
        ${UI.field({ label: 'E-mail', id: 'email', type: 'email', placeholder: 'navn@mail.dk', icon: 'mail', required: true })}
        ${UI.field({ label: 'Adgangskode', id: 'pw', type: 'password', placeholder: 'Mindst 8 tegn', icon: 'lock', required: true, hint: 'Brug mindst 8 tegn' })}
        ${UI.checkbox({ id: 'terms', label: 'Jeg accepterer <a class="t-link" href="#/help">vilkår</a> og <a class="t-link" href="#/help">privatlivspolitik</a>' })}
        ${UI.btn({ label: 'Fortsæt', size: 'lg', full: true, attr: { type: 'submit' } })}
      </form>
      <p class="t-center t-muted">Har du allerede en konto? <a class="t-link" href="#/login" style="color:var(--text)">Log ind</a></p>
    </div></div>`
  });

  S.interests = () => ({
    html: `${UI.topbar({ title: UI.stepper(2, 2), back: true })}
    <div class="content content--footer"><div class="px stack gap-6">
      <div><h1 class="t-h1">Hvad kan du lide?</h1><p class="t-muted mt-2">Vælg et par ting, så viser vi dig de bedste fund først.</p></div>
      <div class="row-flex gap-2" style="flex-wrap:wrap">${[...D.categories.map((c) => c.label), 'Ganni', 'Nike', 'Adidas', 'Levi’s', 'Carhartt', 'Skind', 'Retro', 'Minimalistisk'].map((l, i) => UI.chip(l, { action: 'toggle-chip', active: i < 2 })).join('')}</div>
    </div></div>
    <div class="footer">${UI.btn({ label: 'Se mit feed', size: 'lg', full: true, href: '#/home' })}</div>`
  });

  /* ======================= HOME ======================= */
  S.home = () => {
    const recs = D.items.slice(0, 8);
    return {
      tab: 'home', html: `
      <header class="topbar">${UI.searchbar({ readonlyHref: '#/search' })}${UI.iconBtn({ icon: 'heart', label: 'Favoritter', href: '#/favorites' })}${UI.iconBtn({ icon: 'bell', label: 'Notifikationer', href: '#/notifications', dot: true })}</header>
      <div class="content content--tabs">
        <section class="hero" aria-label="Kampagne">
          <h2 class="t-display" style="font-size:28px;line-height:32px;max-width:220px">Giv tøjet nyt liv. Sælg nemt, køb unikt.</h2>
          <div>${UI.btn({ label: 'Sælg nu', variant: 'dark', size: 'sm', href: '#/sell' })}</div>
        </section>
        <section class="section" style="padding-top:var(--s-6)">${UI.sectionHead('Kategorier', 'Se alle', '#/search')}</section>
        <div class="hscroll">${D.categories.map((c) => UI.category(c)).join('')}</div>
        <section class="section">${UI.sectionHead('Anbefalet til dig')}</section>
        ${UI.productGrid(recs.slice(0, 4), favs())}
        <section class="section">${UI.sectionHead('Næsten ny', 'Se mere', '#/results/næsten ny')}</section>
        <div class="hscroll">${D.items.filter((i) => /ny/i.test(i.cond)).map((i) => UI.productCard(i, favs(), 'h')).join('')}</div>
        <section class="section">${UI.sectionHead('Flere fund til dig')}</section>
        ${UI.productGrid(recs.slice(4), favs())}
        <div class="px mt-8 t-center t-muted t-small">Du har set det hele. Kom tilbage senere for nye fund.</div>
      </div>`
    };
  };

  /* ======================= SEARCH ======================= */
  S.search = () => ({
    tab: 'search', html: `
    <header class="topbar">${UI.searchbar({ id: 'q', autofocus: false })}</header>
    <div class="content content--tabs">
      <div id="suggest" class="px" hidden></div>
      <div id="browse">
      <section class="section" style="padding-top:var(--s-2)">
        <div class="section-head" style="padding:0"><h2 class="t-h3">Seneste søgninger</h2><button class="t-small t-bold" data-action="clear-recent" style="color:var(--forest)">Ryd</button></div>
        <div id="recent" class="row-flex gap-2" style="flex-wrap:wrap">${D.recent.map((r) => UI.chip(r, { icon: 'clock', href: '#/results/' + encodeURIComponent(r) })).join('')}</div>
      </section>
      <section class="section"><h2 class="t-h3 mb-2">Populært lige nu</h2>
        <div class="row-flex gap-2" style="flex-wrap:wrap">${D.trending.map((r) => UI.chip(r, { href: '#/results/' + encodeURIComponent(r) })).join('')}</div>
      </section>
      <section class="section"><h2 class="t-h3 mb-4">Udforsk kategorier</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s-4) 0;justify-items:center">${D.categories.map((c) => UI.category(c)).join('')}</div>
      </section>
      <section class="section">${UI.notice('Gem en søgning, så giver vi besked, når der kommer nye varer.', 'bell')}</section>
      </div>
    </div>`,
    mount(el) {
      const q = el.querySelector('#q'), sug = el.querySelector('#suggest'), br = el.querySelector('#browse');
      const pool = [...D.trending, ...D.items.map((i) => i.title)];
      q.addEventListener('input', () => {
        const v = q.value.trim().toLowerCase();
        const m = v ? pool.filter((p) => p.toLowerCase().includes(v)).slice(0, 6) : [];
        sug.hidden = !v; br.hidden = !!v;
        sug.innerHTML = (m.length ? m : [q.value]).map((t) => `<a class="lrow" style="padding-left:0;padding-right:0;min-height:52px" href="#/results/${encodeURIComponent(t)}">${UI.icon('search', 20)}<span class="grow t-bold">${esc(t)}</span>${UI.icon('arrow', 18)}</a>`).join('');
      });
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && q.value.trim()) location.hash = '#/results/' + encodeURIComponent(q.value.trim()); });
    }
  });

  /* ======================= RESULTS / CATEGORY ======================= */
  function applyFilters(list) {
    const f = App.state.filters;
    let r = list.filter((i) => (!f.cond.size || [...f.cond].some((c) => i.cond.toLowerCase().includes(c.toLowerCase()))) && i.price <= f.max);
    if (f.sort === 'low') r.sort((a, b) => a.price - b.price);
    if (f.sort === 'high') r.sort((a, b) => b.price - a.price);
    return r;
  }
  const matchQ = (q) => D.items.filter((i) => !q || (i.title + ' ' + i.brand + ' ' + i.tags.join(' ') + ' ' + i.cond + ' ' + i.cat).toLowerCase().includes(q.toLowerCase()));
  function resultsScreen(title, base, q) {
    const f = App.state.filters, list = applyFilters(base);
    const n = f.cond.size + (f.max < 2000 ? 1 : 0) + (f.sort !== 'new' ? 1 : 0);
    const sortLabel = { new: 'Nyeste', low: 'Laveste pris', high: 'Højeste pris' }[f.sort];
    return {
      html: `<header class="topbar">${UI.iconBtn({ icon: 'back', label: 'Tilbage', action: 'back' })}${q != null ? UI.searchbar({ id: 'q', value: q }) : '<h1 class="topbar__title">' + esc(title) + '</h1>'}${UI.iconBtn({ icon: 'filter', label: 'Filtre', action: 'sheet', attr: { 'data-sheet': 'filter' }, dot: n > 0 })}</header>
      <div class="content content--footer">
        <div class="hscroll" style="padding-bottom:var(--s-3)">
          ${UI.chip('Filtre' + (n ? ' · ' + n : ''), { icon: 'filter', action: 'sheet', value: 'filter', active: n > 0 }).replace('data-value="filter"', 'data-sheet="filter"')}
          ${UI.chip(sortLabel, { icon: 'sort', action: 'sheet' }).replace('<button', '<button data-sheet="filter"')}
          ${UI.chip('Næsten ny', { action: 'quick-cond', value: 'Næsten ny', active: f.cond.has('Næsten ny') })}
          ${UI.chip('Som ny', { action: 'quick-cond', value: 'Som ny', active: f.cond.has('Som ny') })}
          ${UI.chip('Under 300 kr.', { action: 'quick-price', active: f.max === 300 })}
        </div>
        <div class="px row-flex" style="justify-content:space-between;margin-bottom:var(--s-3)"><span class="t-small t-muted"><b style="color:var(--text)">${list.length}</b> ${list.length === 1 ? 'vare' : 'varer'}${q ? ' til “' + esc(q) + '”' : ''}</span>${q ? '<button class="t-small t-bold row-flex gap-1" style="color:var(--forest)" data-action="toast" data-msg="Søgning gemt – vi giver besked om nyt">' + UI.icon('bell', 16) + 'Gem søgning</button>' : ''}</div>
        ${list.length ? UI.productGrid(list, favs()) : UI.empty({ icon: 'search', title: 'Ingen varer fundet', text: 'Prøv at fjerne et filter eller søg efter noget andet.', cta: UI.btn({ label: 'Nulstil filtre', variant: 'outline', action: 'reset-filters' }) })}
      </div>`,
      mount(el) { const q = el.querySelector('#q'); if (q) q.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = '#/results/' + encodeURIComponent(q.value.trim()); }); }
    };
  }
  S.results = ([q]) => resultsScreen('Søgning', matchQ(q ? decodeURIComponent(q) : ''), q ? decodeURIComponent(q) : '');
  S.category = ([id]) => { const c = D.categories.find((c) => c.id === id) || { label: 'Kategori' }; return resultsScreen(c.label, D.items.filter((i) => i.cat === id)); };

  /* ======================= ITEM DETAIL ======================= */
  S.item = ([id]) => {
    const it = item(id); if (!it) return S.notfound();
    const s = D.sellers[it.seller], fee = UI.fee(it.price);
    const similar = D.items.filter((i) => i.id !== it.id && (i.cat === it.cat || i.tone === it.tone)).slice(0, 6);
    return {
      cls: 'screen--bleed', html: `
      <div class="topbar topbar--float">${UI.iconBtn({ icon: 'back', label: 'Tilbage', action: 'back', variant: 'glass' })}<span class="grow"></span>${UI.iconBtn({ icon: 'share', label: 'Del', action: 'sheet', variant: 'glass', attr: { 'data-sheet': 'share' } })}${UI.favBtn(it, favs())}</div>
      <div class="content content--footer">
        <div style="position:relative">
          <div class="hscroll" id="gallery" style="padding:0;gap:0;scroll-snap-type:x mandatory">
            ${[0, 1, 2].map((n) => `<div style="flex:0 0 100%;scroll-snap-align:start">${UI.ph({ shade: it.id + n, title: it.title }, 'wide')}</div>`).join('')}
          </div>
          <div class="dots" id="dots" style="position:absolute;left:0;right:0;bottom:56px"><i class="on"></i><i></i><i></i></div>
          <a href="#/user/${s.id}" class="row-flex gap-3" style="position:absolute;left:var(--gutter);right:var(--gutter);bottom:-32px;background:var(--surface);padding:var(--s-3) var(--s-4);border-radius:var(--r-lg);box-shadow:var(--shadow-2)">
            ${UI.avatar(s.name, '')}<div class="grow"><div class="t-bold">${esc(s.name)}</div>${UI.rating(s.rating, s.reviews + ' vurderinger')}</div>${UI.icon('next', 20)}</a>
        </div>
        <div class="px" style="margin-top:56px">
          <h1 class="t-h1">${esc(it.title)}</h1>
          <div class="row-flex gap-2 mt-2"><span class="t-h1 t-price">${kr(it.price)}</span><span class="t-small t-muted">${UI.icon('pin', 14, ' style="display:inline;vertical-align:-2px"')} ${esc(s.city)}</span></div>
          <p class="t-small t-muted mt-2">${kr(it.price + fee)} inkl. køberbeskyttelse</p>
          <div class="row-flex gap-2 mt-4" style="flex-wrap:wrap">${it.tags.map((t) => UI.chip('#' + t, { tag: true, href: '#/results/' + t })).join('')}</div>
          <hr class="divider">
          <h2 class="t-h3 mb-2">Specifikationer</h2>
          <dl class="spec"><dt>Brand</dt><dd>${esc(it.brand)}</dd><dt>Størrelse</dt><dd>${esc(it.size)}</dd><dt>Stand</dt><dd>${esc(it.cond)}</dd><dt>Farve</dt><dd>${esc(it.color)}</dd><dt>Fragt</dt><dd>${esc(it.ship)}</dd></dl>
          <hr class="divider">
          <h2 class="t-h3 mb-2">Beskrivelse</h2><p>${esc(it.desc)}</p>
          <hr class="divider">
          <h2 class="t-h3 mb-2">Sikkerhed</h2>
          ${UI.notice('<b>Køberbeskyttelse inkluderet.</b> Vi holder pengene, til du har modtaget varen. Passer den ikke til beskrivelsen, får du pengene tilbage.', 'shield')}
          <button class="t-small t-muted row-flex gap-1 mt-4" data-action="sheet" data-sheet="report">${UI.icon('flag', 16)} Rapportér annonce</button>
        </div>
        <div class="divider divider--thick"></div>
        ${UI.sectionHead('Lignende varer')}
        <div class="hscroll">${similar.map((i) => UI.productCard(i, favs(), 'h')).join('')}</div>
        <div style="height:var(--s-6)"></div>
      </div>
      <div class="footer">${UI.btn({ label: 'Byd', variant: 'outline', size: 'lg', action: 'sheet', attr: { 'data-sheet': 'offer', 'data-id': it.id, style: 'flex:1' } })}${UI.btn({ label: 'Køb nu', variant: 'buy', size: 'lg', href: '#/checkout/' + it.id, attr: { style: 'flex:1.4' } })}</div>`,
      mount(el) {
        const g = el.querySelector('#gallery'), dots = [...el.querySelectorAll('#dots i')];
        g.addEventListener('scroll', () => { const n = Math.round(g.scrollLeft / g.clientWidth); dots.forEach((d, i) => d.classList.toggle('on', i === n)); }, { passive: true });
      }
    };
  };

  /* ======================= PROFILES ======================= */
  const reviewList = () => `<div class="px stack gap-4 py-4">${D.reviews.map((r) => `<div class="row-flex gap-3" style="align-items:flex-start">${UI.avatar(r.name)}<div class="grow"><div class="row-flex" style="justify-content:space-between"><b>${esc(r.name)}</b><span class="t-caption t-muted">${r.time}</span></div><div class="rating">${'★'.repeat(r.stars)}<span style="color:var(--slate-300)">${'★'.repeat(5 - r.stars)}</span></div><p class="t-small mt-2">${esc(r.text)}</p></div></div>`).join('')}</div>`;

  S.user = ([id]) => {
    const s = D.sellers[id]; if (!s) return S.notfound();
    const tab = ui('utab', 'items'), list = D.items.filter((i) => i.seller == id);
    return {
      html: `${UI.topbar({ title: esc(s.name), back: true, actions: UI.iconBtn({ icon: 'more', label: 'Mere', action: 'sheet', attr: { 'data-sheet': 'report' } }) })}
      <div class="content content--footer">
        <div class="px stack gap-4" style="align-items:center;text-align:center;padding-top:var(--s-2)">
          ${UI.avatar(s.name, 'xl')}
          <div><h2 class="t-h1">${esc(s.name)}</h2><div class="row-flex gap-2" style="justify-content:center;margin-top:4px">${UI.rating(s.rating, s.reviews)}<span class="t-small t-muted">· ${esc(s.city)}</span></div></div>
          <div class="row-flex gap-2" style="flex-wrap:wrap;justify-content:center">${UI.badge('E-mail verificeret', 'soft', 'check')}${UI.badge(s.replies, 'soft', 'clock')}</div>
          <div class="row-flex" style="width:100%;padding:var(--s-3) 0;border-block:1px solid var(--border)"><div class="stat"><b>${list.length}</b><span>Annoncer</span></div><div class="stat"><b>${s.followers}</b><span>Følgere</span></div><div class="stat"><b>${s.since}</b><span>Medlem siden</span></div></div>
          <div class="row-flex gap-3" style="width:100%">${UI.btn({ label: ui('follow' + id) ? 'Følger' : 'Følg', variant: ui('follow' + id) ? 'outline' : 'primary', action: 'follow', attr: { 'data-id': id, style: 'flex:1' } })}${UI.btn({ label: 'Skriv', variant: 'outline', icon: 'chat', href: '#/chat/i' + (list[0] ? list[0].id : 1), attr: { style: 'flex:1' } })}</div>
        </div>
        <div class="mt-4" style="position:relative">${UI.tabs([['items', 'Annoncer'], ['reviews', 'Anmeldelser']], tab, 'utab')}</div>
        ${tab === 'items' ? `<div class="mt-4">${UI.productGrid(list, favs())}</div>` : reviewList()}
      </div>`
    };
  };

  S.profile = () => {
    const m = D.me, tab = ui('ptab', 'items'), mine = D.items.slice(2, 6);
    return {
      tab: 'profile', html: `
      ${UI.topbar({ title: 'Profil', variant: 'left', actions: UI.iconBtn({ icon: 'settings', label: 'Indstillinger', href: '#/settings' }) })}
      <div class="content content--tabs">
        <div class="px row-flex gap-4">${UI.avatar(m.name, 'lg')}<div class="grow"><h2 class="t-h2">${esc(m.name)}</h2><div class="t-small t-muted">${m.handle} · ${esc(m.city)}</div><div class="mt-2">${UI.rating(m.rating, m.reviews)}</div></div></div>
        <p class="px t-small mt-4">${esc(m.bio)}</p>
        <div class="px row-flex gap-3 mt-4">
          <div class="row-flex stat-row" style="flex:1"><div class="stat"><b>${mine.length}</b><span>Annoncer</span></div><div class="stat"><b>${m.followers}</b><span>Følgere</span></div><div class="stat"><b>${m.following}</b><span>Følger</span></div></div>
        </div>
        <div class="px mt-4">${UI.btn({ label: 'Rediger profil', variant: 'outline', full: true, icon: 'edit', href: '#/profile/edit' })}</div>
        <div class="grid-tiles mt-6">
          <a class="tile" href="#/wallet"><span class="tile__icon">${UI.icon('wallet', 20)}</span><span class="t-small t-muted">Saldo</span><b class="t-h3 t-price">${kr(m.balance)}</b></a>
          <a class="tile" href="#/orders"><span class="tile__icon">${UI.icon('package', 20)}</span><span class="t-small t-muted">Ordrer</span><b class="t-h3">2 undervejs</b></a>
          <a class="tile" href="#/favorites"><span class="tile__icon">${UI.icon('heart', 20)}</span><span class="t-small t-muted">Favoritter</span><b class="t-h3">${favs().size} varer</b></a>
          <a class="tile" href="#/help"><span class="tile__icon">${UI.icon('help', 20)}</span><span class="t-small t-muted">Hjælp</span><b class="t-h3">Support</b></a>
        </div>
        <div class="mt-6">${UI.tabs([['items', 'Mine annoncer'], ['reviews', 'Anmeldelser']], tab, 'ptab')}</div>
        ${tab === 'items' ? `<div class="mt-4">${UI.productGrid(mine, favs())}</div>` : reviewList()}
      </div>`
    };
  };

  S['profile/edit'] = () => ({
    html: `${UI.topbar({ title: 'Rediger profil', back: true })}
    <div class="content content--footer"><div class="px stack gap-6">
      <div class="stack gap-2" style="align-items:center">${UI.avatar(D.me.name, 'xl')}${UI.btn({ label: 'Skift billede', variant: 'ghost', size: 'sm', icon: 'camera', action: 'toast', attr: { 'data-msg': 'Kamera åbnes her' } })}</div>
      <form class="form-stack" data-form="profile">
        ${UI.field({ label: 'Navn', id: 'n', value: D.me.name, required: true })}
        ${UI.field({ label: 'Brugernavn', id: 'h', value: D.me.handle, required: true })}
        ${UI.textarea({ label: 'Om mig', id: 'b', value: D.me.bio, hint: 'Fortæl købere lidt om dig selv' })}
        ${UI.field({ label: 'By', id: 'c', value: D.me.city, icon: 'pin', required: true })}
        ${UI.btn({ label: 'Gem ændringer', size: 'lg', full: true, attr: { type: 'submit' } })}
      </form>
    </div></div>`
  });

  /* ======================= SELL ======================= */
  S.sell = () => ({
    html: `${UI.topbar({ title: 'Sælg noget nyt', left: UI.iconBtn({ icon: 'close', label: 'Luk', action: 'back' }), actions: '<button class="btn btn--ghost btn--sm" data-action="toast" data-msg="Kladde gemt">Gem kladde</button>' })}
    <div class="content content--footer">
      <div class="px"><div class="row-flex" style="justify-content:space-between" class="t-small"><span class="t-small t-bold" id="pLabel">0 af 5 udfyldt</span><span class="t-small t-muted">Gratis at sælge</span></div><div class="mt-2" id="pBar">${UI.progress(0)}</div></div>
      <form id="sellForm" class="px form-stack mt-6" novalidate>
        <section class="stack gap-3"><h2 class="t-h3">Billeder</h2><p class="t-small t-muted" style="margin-top:-8px">Tilføj op til 8 billeder. Første billede bliver forsidebillede.</p>
          <div class="uploader" id="uploader"></div></section>
        <label class="row-flex gap-3 optcard" style="cursor:pointer"><span class="lrow__icon">${UI.icon('image', 20)}</span><span class="grow"><b class="t-bold" style="display:block">AI-baggrundsfjerner</b><span class="t-small t-muted">Fjern baggrunden og få et rent produktbillede</span></span>${UI.toggle({ id: 'bg', checked: true, label: 'Fjern baggrund' })}</label>
        <section class="form-stack"><h2 class="t-h3">Detaljer</h2>
          ${UI.field({ label: 'Titel', id: 't', placeholder: 'fx Ganni uldjakke, str. M', required: true, hint: 'Skriv brand, type og størrelse' })}
          ${UI.textarea({ label: 'Beskrivelse', id: 'd', placeholder: 'Fortæl om stand, pasform og evt. fejl…' })}
          ${UI.select({ label: 'Kategori', id: 'cat', options: D.categories.map((c) => c.label) })}
          <div class="form-grid">${UI.field({ label: 'Brand', id: 'brand', placeholder: 'fx Ganni', required: false })}${UI.select({ label: 'Størrelse', id: 'size', options: ['XS', 'S', 'M', 'L', 'XL', '38', '40', '42', 'One size'], required: false })}</div>
          <div class="stack gap-2"><span class="field__label">Stand</span><div class="row-flex gap-2" style="flex-wrap:wrap" id="cond">${['Ny med mærke', 'Som ny', 'Næsten ny', 'God men brugt'].map((c) => UI.chip(c, { action: 'cond', value: c, active: false })).join('')}</div></div>
        </section>
        <section class="form-stack"><h2 class="t-h3">Pris</h2>
          ${UI.field({ label: 'Din pris', id: 'price', placeholder: '0', suffix: 'kr.', inputmode: 'numeric', required: true })}
          <div id="priceInfo" class="notice">${UI.icon('info', 20)}<div>Sæt en pris, så viser vi hvad du får udbetalt.</div></div>
        </section>
        <section class="form-stack"><h2 class="t-h3">Forsendelse</h2>
          ${UI.optcard({ name: 'ship', value: 's', title: 'Lille pakke', sub: 'Op til 2 kg · fra 39 kr.', icon: 'package', checked: true })}
          ${UI.optcard({ name: 'ship', value: 'm', title: 'Medium pakke', sub: 'Op til 5 kg · fra 49 kr.', icon: 'truck' })}
          <p class="t-small t-muted">Køberen betaler fragten. Du får en label, så snart varen er solgt.</p>
        </section>
      </form>
    </div>
    <div class="footer">${UI.btn({ label: 'Sæt til salg', variant: 'primary', size: 'lg', full: true, id: 'publish', disabled: true })}</div>`,
    mount(el) {
      const st = { photos: [], cond: '' }, f = el.querySelector('#sellForm'), up = el.querySelector('#uploader');
      const tones = ['sage', 'sand', 'blush', 'sky', 'brown', 'stone', 'forest', 'lime'];
      const draw = () => {
        up.innerHTML = st.photos.map((t, i) => `<div class="uploader__slot uploader__slot--filled">${UI.ph({ shade: i, title: 'Billede ' + (i + 1) }, '34')}${i === 0 ? '<span class="badge uploader__cover">Forside</span>' : ''}${UI.iconBtn({ icon: 'close', label: 'Fjern billede', variant: 'glass', size: 16, action: 'rm-photo', attr: { 'data-i': i } })}</div>`).join('') +
          (st.photos.length < 8 ? `<button type="button" class="uploader__slot uploader__slot--add" data-action="add-photo">${UI.icon(st.photos.length ? 'plus' : 'camera', 28)}${st.photos.length ? 'Tilføj' : 'Upload billeder'}</button>` : '');
        calc();
      };
      const calc = () => {
        const v = (id) => (el.querySelector('#' + id).value || '').trim();
        const price = +v('price') || 0;
        const done = [st.photos.length > 0, v('t').length > 2, !!v('cat'), !!st.cond, price > 0];
        const n = done.filter(Boolean).length;
        el.querySelector('#pLabel').textContent = n + ' af 5 udfyldt';
        el.querySelector('#pBar').innerHTML = UI.progress(n * 20);
        const btn = el.querySelector('#publish'); btn.disabled = n < 5;
        el.querySelector('#priceInfo').innerHTML = price ? `${UI.icon('wallet', 20)}<div><b>Du får ${kr(price)}</b> – ingen gebyrer for sælger.<br>Køber betaler ${kr(price + UI.fee(price))} inkl. køberbeskyttelse.</div>` : `${UI.icon('info', 20)}<div>Sæt en pris, så viser vi hvad du får udbetalt.</div>`;
      };
      el.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]'); if (!a) return;
        if (a.dataset.action === 'add-photo') { st.photos.push(tones[st.photos.length % tones.length]); draw(); App.toast(el.querySelector('#bg').checked ? 'Baggrund fjernet automatisk' : 'Billede tilføjet', 'check'); e.stopPropagation(); }
        if (a.dataset.action === 'rm-photo') { st.photos.splice(+a.dataset.i, 1); draw(); e.stopPropagation(); }
        if (a.dataset.action === 'cond') { st.cond = a.dataset.value; el.querySelectorAll('#cond .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === a))); calc(); e.stopPropagation(); }
      }, true);
      f.addEventListener('input', calc);
      el.querySelector('#publish').addEventListener('click', () => { location.hash = '#/sell/success'; });
      draw();
    }
  });

  S['sell/success'] = () => ({
    html: `${UI.topbar({ title: '', left: UI.iconBtn({ icon: 'close', label: 'Luk', href: '#/home' }) })}
    <div class="content content--footer"><div class="px stack gap-6" style="padding-top:var(--s-6)">
      <div><h1 class="t-display">Din annonce er live</h1><p class="t-muted mt-2">Den er nu synlig for købere. Du får besked, når nogen byder eller skriver.</p></div>
      <div class="list" style="margin:0;padding:var(--s-3)">${UI.productRow(D.items[1], UI.badge('Aktiv', 'soft'))}</div>
    </div></div>
    <div class="footer" style="flex-direction:column;align-items:stretch">${UI.btn({ label: 'Se min annonce', size: 'lg', full: true, href: '#/item/2' })}${UI.btn({ label: 'Sælg noget mere', variant: 'outline', size: 'lg', full: true, href: '#/sell' })}</div>`
  });

  /* ======================= FAVORITES ======================= */
  S.favorites = () => {
    const list = D.items.filter((i) => favs().has(i.id)), tab = ui('ftab', 'items');
    return {
      html: `${UI.topbar({ title: 'Favoritter', back: true })}<div class="px">${UI.segmented([['items', 'Varer'], ['sellers', 'Sælgere']], tab, 'ftab')}</div>
      <div class="content content--footer mt-4">${tab === 'items'
        ? (list.length ? UI.productGrid(list, favs()) : UI.empty({ icon: 'heart', title: 'Ingen favoritter endnu', text: 'Tryk på hjertet på en vare for at gemme den her – og få besked ved prisfald.', cta: UI.btn({ label: 'Find fund', href: '#/home' }) }))
        : `<div class="list">${[1, 3].map((id) => { const s = D.sellers[id]; return `<a class="lrow" href="#/user/${id}">${UI.avatar(s.name)}<span class="grow"><span class="lrow__title" style="display:block">${esc(s.name)}</span>${UI.rating(s.rating, s.reviews)}</span>${UI.icon('next', 20)}</a>`; }).join('')}</div>`}</div>`
    };
  };

  /* ======================= INBOX / CHAT ======================= */
  S.inbox = () => ({
    tab: 'inbox', html: `<header class="topbar topbar--left"><h1 class="topbar__title">Beskeder</h1>${UI.iconBtn({ icon: 'bell', label: 'Notifikationer', href: '#/notifications', dot: true })}</header>
    <div class="content content--tabs">${D.convos.map(UI.convo).join('')}
      <div class="px mt-6">${UI.notice('Hold al kommunikation og betaling i appen, så er du dækket af køberbeskyttelsen.', 'shield')}</div></div>`
  });

  S.notifications = () => ({
    html: `${UI.topbar({ title: 'Notifikationer', back: true, actions: '<button class="btn btn--ghost btn--sm" data-action="toast" data-msg="Alt markeret som læst">Læs alle</button>' })}
    <div class="content content--footer">${D.notifications.map((n) => `<div class="convo">${'<span class="lrow__icon">' + UI.icon(n.icon, 20) + '</span>'}<div class="convo__body"><div class="t-bold">${esc(n.title)}</div><div class="t-small t-muted">${esc(n.sub)}</div></div><div class="stack gap-2" style="align-items:flex-end"><span class="t-caption t-muted">${n.time}</span>${n.unread ? '<span class="unread"></span>' : ''}</div></div>`).join('')}</div>`
  });

  S.chat = ([id]) => {
    let c, it;
    if (/^i/.test(id)) { it = item(id.slice(1)); c = { id, name: D.sellers[it.seller].name, online: true, itemId: it.id }; }
    else { c = D.convos.find((x) => x.id == id) || D.convos[0]; it = item(c.itemId); }
    const offerOut = c.id === 3;
    return {
      html: `${UI.topbar({ title: `<span class="row-flex gap-2" style="justify-content:center">${UI.avatar(c.name, 'sm', c.online)}${esc(c.name)}</span>`, back: true, actions: UI.iconBtn({ icon: 'more', label: 'Mere', action: 'sheet', attr: { 'data-sheet': 'report' } }) })}
      <a class="pinned" href="#/item/${it.id}">${UI.ph(it, 'sq')}<div class="grow"><div class="t-bold t-small">${esc(it.title)}</div><div class="t-small">${UI.price(it.price)}</div></div>${UI.btn({ label: 'Byd', variant: 'outline', size: 'sm', action: 'sheet', attr: { 'data-sheet': 'offer', 'data-id': it.id } })}</a>
      <div class="content" id="msgs"><div class="chat">
        <div class="chat__day">I dag</div>
        ${UI.bubble('Hej! Er den stadig til salg?', 'in', '9:41')}
        ${UI.bubble('Hej! Ja, den er stadig til salg', 'out', '9:43')}
        ${offerOut ? `<div class="offer"><div class="t-caption t-muted">Dit bud</div><div class="t-h2 t-price">300 kr.</div><div class="row-flex gap-2 mt-2">${UI.badge('Afventer svar', 'warn', 'clock')}</div></div>` : `${UI.bubble('Kan du sende den i dag?', 'in', '9:44')}<div class="chat__day">Tip: Brug “Byd”, så er du dækket af køberbeskyttelse</div>`}
      </div></div>
      <div class="hscroll" style="padding-block:var(--s-2)">${['Er den stadig til salg?', 'Kan du sende i dag?', 'Tak!', 'Kan vi mødes?'].map((t) => UI.chip(t, { size: 'sm', action: 'quick-reply', value: t })).join('')}</div>
      <form class="composer" id="composer">${UI.iconBtn({ icon: 'camera', label: 'Vedhæft billede', action: 'toast', attr: { 'data-msg': 'Vælg et billede' } })}<input class="input" id="msg" placeholder="Skriv en besked…" aria-label="Besked" autocomplete="off">${UI.iconBtn({ icon: 'send', label: 'Send', variant: 'soft', attr: { type: 'submit' } })}</form>`,
      mount(el) {
        const box = el.querySelector('.chat'), sc = el.querySelector('#msgs'), inp = el.querySelector('#msg');
        sc.scrollTop = sc.scrollHeight;
        const send = (t) => { if (!t.trim()) return; box.insertAdjacentHTML('beforeend', UI.bubble(t.trim(), 'out', 'nu')); inp.value = ''; sc.scrollTop = sc.scrollHeight; };
        el.querySelector('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(inp.value); });
        el.addEventListener('click', (e) => { const q = e.target.closest('[data-action="quick-reply"]'); if (q) { send(q.dataset.value); e.stopPropagation(); } }, true);
      }
    };
  };

  /* ======================= CHECKOUT / ORDERS ======================= */
  S.checkout = ([id]) => {
    const it = item(id) || D.items[0], fee = UI.fee(it.price);
    return {
      html: `${UI.topbar({ title: 'Betaling', back: true })}
      <div class="content content--footer"><div class="px stack gap-6">
        <div class="list" style="margin:0;padding:var(--s-3)">${UI.productRow(it, '<b class="t-price">' + kr(it.price) + '</b>')}</div>
        <section class="stack gap-3"><h2 class="t-h3">Leveringsadresse</h2>${UI.list([UI.row({ icon: 'pin', title: D.me.name, sub: 'Jægergårdsgade 12, 8000 Aarhus C', action: 'toast', value: '' }).replace('data-action="toast"', 'data-action="toast" data-msg="Rediger adresse"')]).replace('class="list"', 'class="list" style="margin:0"')}</section>
        <section class="stack gap-3"><h2 class="t-h3">Forsendelse</h2>
          ${UI.optcard({ name: 'ship', value: 39, title: 'Pakkeshop · DAO', sub: 'Afhent hos Netto, Jægergårdsgade · 2–3 dage', icon: 'pin', right: '39 kr.', checked: true })}
          ${UI.optcard({ name: 'ship', value: 59, title: 'Hjemmelevering · PostNord', sub: 'Leveres til døren · 2–3 dage', icon: 'truck', right: '59 kr.' })}
        </section>
        <section class="stack gap-3"><h2 class="t-h3">Betalingsmetode</h2>
          ${UI.optcard({ name: 'pay', value: 'mp', title: 'MobilePay', sub: '+45 •• •• 12 34', icon: 'phone', checked: true })}
          ${UI.optcard({ name: 'pay', value: 'card', title: 'Betalingskort', sub: 'Visa •••• 4242', icon: 'card' })}
          ${UI.optcard({ name: 'pay', value: 'ap', title: 'Apple Pay', icon: 'apple' })}
        </section>
        <section class="stack gap-3"><h2 class="t-h3">Oversigt</h2><div id="sum"></div>
          ${UI.notice('<b>Køberbeskyttelse:</b> Pengene holdes sikkert, indtil du har godkendt varen.', 'shield')}</section>
      </div></div>
      <div class="footer"><div class="grow"><div class="t-caption t-muted">I alt</div><div class="t-h2 t-price" id="total"></div></div>${UI.btn({ label: 'Betal og køb', variant: 'buy', size: 'lg', id: 'pay', attr: { style: 'flex:1.4' } })}</div>`,
      mount(el) {
        const calc = () => {
          const ship = +el.querySelector('input[name=ship]:checked').value, total = it.price + fee + ship;
          el.querySelector('#sum').innerHTML = UI.sum([['Vare', kr(it.price)], ['Køberbeskyttelse', kr(fee)], ['Forsendelse', kr(ship)]], ['I alt', kr(total)]);
          el.querySelector('#total').textContent = kr(total);
        };
        el.addEventListener('change', calc); calc();
        el.querySelector('#pay').addEventListener('click', (e) => { e.target.closest('button').disabled = true; e.target.closest('button').textContent = 'Behandler…'; setTimeout(() => (location.hash = '#/order/success'), 700); });
      }
    };
  };

  S['order/success'] = () => ({
    html: `${UI.topbar({ title: '', left: UI.iconBtn({ icon: 'close', label: 'Luk', href: '#/home' }) })}
    <div class="content content--footer"><div class="px stack gap-6" style="padding-top:var(--s-6)">
      <div><h1 class="t-display">Tak for dit køb</h1><p class="t-muted mt-2">Mette sender din vare inden for 2 dage. Vi giver besked, når pakken er på vej.</p></div>
      <div class="list" style="margin:0;padding:var(--s-4)">${UI.timeline([{ title: 'Betalt', sub: 'I dag', state: 'done' }, { title: 'Afsendes af sælger', sub: 'Inden for 2 dage', state: 'now' }, { title: 'Leveret', sub: 'Forventet 8.–10. nov.' }])}</div>
    </div></div>
    <div class="footer" style="flex-direction:column;align-items:stretch">${UI.btn({ label: 'Følg min ordre', size: 'lg', full: true, href: '#/order/101' })}${UI.btn({ label: 'Fortsæt med at shoppe', variant: 'ghost', full: true, href: '#/home' })}</div>`
  });

  S.orders = () => {
    const tab = ui('otab', 'buy');
    return {
      html: `${UI.topbar({ title: 'Mine ordrer', back: true })}<div class="px">${UI.segmented([['buy', 'Køb'], ['sell', 'Salg']], tab, 'otab')}</div>
      <div class="content content--footer mt-4"><div class="px stack gap-3">${D.orders[tab].map((o) => { const it = item(o.itemId); return `<div class="list" style="margin:0;padding:var(--s-3)">${UI.productRow(it, UI.badge(o.status, o.tone))}<a href="#/order/${o.id}" class="row-flex t-small t-muted" style="justify-content:space-between;margin-top:var(--s-3);padding-top:var(--s-3);border-top:1px solid var(--border)"><span>${o.date} · Ordre #${o.id} · Se detaljer</span><b class="t-price" style="color:var(--text)">${kr(o.price)}</b></a></div>`; }).join('')}</div></div>`
    };
  };

  S.order = ([id]) => {
    const all = [...D.orders.buy, ...D.orders.sell], o = all.find((x) => x.id == id) || all[0], it = item(o.itemId), buying = D.orders.buy.includes(o);
    return {
      html: `${UI.topbar({ title: 'Ordre #' + o.id, back: true })}
      <div class="content content--footer"><div class="px stack gap-6">
        <div class="list" style="margin:0;padding:var(--s-3)">${UI.productRow(it, UI.badge(o.status, o.tone))}</div>
        <section><h2 class="t-h3 mb-4">Status</h2>${UI.timeline(buying
          ? [{ title: 'Betalt', sub: o.date, state: 'done' }, { title: 'Afsendt af sælger', sub: 'PostNord · Spor: 00370…8812', state: o.status === 'Undervejs' || o.status === 'Leveret' ? 'done' : 'now' }, { title: 'Klar til afhentning', sub: 'Netto, Jægergårdsgade', state: o.status === 'Leveret' ? 'done' : (o.status === 'Undervejs' ? 'now' : '') }, { title: 'Godkendt', sub: 'Pengene frigives til sælger', state: o.status === 'Leveret' ? 'done' : '' }]
          : [{ title: 'Solgt', sub: o.date, state: 'done' }, { title: 'Aflevér pakken', sub: 'Print label eller brug QR-kode', state: o.status === 'Skal sendes' ? 'now' : 'done' }, { title: 'Leveret til køber', sub: '', state: o.status === 'Udbetalt' ? 'done' : '' }, { title: 'Udbetalt til saldo', sub: '', state: o.status === 'Udbetalt' ? 'done' : '' }])}</section>
        <section>${UI.sum([['Vare', kr(o.price)], ['Køberbeskyttelse', kr(UI.fee(o.price))], ['Forsendelse', kr(39)]], ['I alt', kr(o.price + UI.fee(o.price) + 39)])}</section>
        <div class="stack gap-3">${buying ? UI.btn({ label: 'Godkend varen', size: 'lg', full: true, action: 'toast', attr: { 'data-msg': 'Tak! Pengene er frigivet' } }) : UI.btn({ label: 'Vis fragtlabel', size: 'lg', full: true, icon: 'package', action: 'toast', attr: { 'data-msg': 'Label åbnes her' } })}${UI.btn({ label: 'Skriv til ' + (buying ? 'sælger' : 'køber'), variant: 'outline', full: true, icon: 'chat', href: '#/chat/i' + it.id })}${buying ? '<button class="t-small t-muted t-center" data-action="sheet" data-sheet="report">Der er et problem med min ordre</button>' : ''}</div>
      </div></div>`
    };
  };

  /* ======================= WALLET / SETTINGS / HELP ======================= */
  S.wallet = () => ({
    html: `${UI.topbar({ title: 'Saldo', back: true })}
    <div class="content content--footer">
      <div class="balance"><div class="t-small" style="opacity:.8">Tilgængeligt til udbetaling</div><div class="t-display" style="color:var(--cream);font-size:44px;line-height:50px;margin:var(--s-2) 0 var(--s-5)">${kr(D.me.balance)}</div>${UI.btn({ label: 'Udbetal til bank', variant: 'outline', action: 'sheet', icon: 'bank', attr: { 'data-sheet': 'payout' } })}</div>
      <div class="px mt-4">${UI.notice('Under behandling: <b>350 kr.</b> frigives, når køber har godkendt varen.', 'clock')}</div>
      <section class="section">${UI.sectionHead('Transaktioner')}</section>
      <div class="list">${D.transactions.map((t) => UI.row({ icon: t.amt > 0 ? 'tag' : 'bank', title: t.title, sub: t.date, chevron: false, trailing: `<b class="t-price" style="color:${t.amt > 0 ? 'var(--forest)' : 'var(--text)'}">${t.amt > 0 ? '+' : '−'}${kr(Math.abs(t.amt))}</b>` })).join('')}</div>
      <section class="section">${UI.sectionHead('Udbetalingskonto')}</section>
      ${UI.list([UI.row({ icon: 'bank', title: 'Danske Bank', sub: 'Reg. 3409 · Konto •••• 5521', action: 'toast', value: '' }).replace('data-action="toast"', 'data-action="toast" data-msg="Rediger bankkonto"')])}
    </div>`
  });

  S.settings = () => {
    const sw = (id, on, label) => UI.toggle({ id, checked: on, label });
    return {
      html: `${UI.topbar({ title: 'Indstillinger', back: true })}
      <div class="content content--footer stack gap-6" style="padding-top:var(--s-2)">
        <section><h2 class="t-small t-muted t-bold px mb-2">KONTO</h2>${UI.list([UI.row({ icon: 'user', title: 'Profil', sub: 'Navn, billede, om mig', href: '#/profile/edit' }), UI.row({ icon: 'lock', title: 'Adgangskode og sikkerhed', href: '#/help' }), UI.row({ icon: 'pin', title: 'Adresser', sub: 'Jægergårdsgade 12, Aarhus C', href: '#/help' })])}</section>
        <section><h2 class="t-small t-muted t-bold px mb-2">BETALING</h2>${UI.list([UI.row({ icon: 'card', title: 'Betalingsmetoder', sub: 'MobilePay, Visa •••• 4242', href: '#/help' }), UI.row({ icon: 'wallet', title: 'Saldo og udbetaling', href: '#/wallet' })])}</section>
        <section><h2 class="t-small t-muted t-bold px mb-2">NOTIFIKATIONER</h2>${UI.list([UI.row({ icon: 'chat', title: 'Beskeder', trailing: sw('n1', true, 'Beskeder') }), UI.row({ icon: 'tag', title: 'Prisfald og bud', trailing: sw('n2', true, 'Prisfald og bud') }), UI.row({ icon: 'mail', title: 'Nyheder og tilbud', trailing: sw('n3', false, 'Nyheder') })])}</section>
        <section><h2 class="t-small t-muted t-bold px mb-2">APP</h2>${UI.list([UI.row({ icon: 'info', title: 'Sprog', trailing: '<span class="t-muted">Dansk</span>' }), UI.row({ icon: 'help', title: 'Hjælp og support', href: '#/help' })])}</section>
        <section>${UI.list([UI.row({ icon: 'logout', title: 'Log ud', danger: true, href: '#/welcome', chevron: false })])}<p class="t-center t-caption t-muted mt-4">re:spin · version 0.1 skelet</p></section>
      </div>`
    };
  };

  S.help = () => ({
    html: `${UI.topbar({ title: 'Hjælp og support', back: true })}
    <div class="content content--footer"><div class="px stack gap-4">
      ${UI.searchbar({ placeholder: 'Søg i hjælp…', id: 'hq' })}
      <h2 class="t-h3">Ofte stillede spørgsmål</h2>
      <div class="list" style="margin:0">${D.faq.map(([q, a]) => `<details class="faq"><summary class="lrow"><span class="grow t-bold">${esc(q)}</span>${UI.icon('down', 20)}</summary><p class="t-small" style="padding:0 var(--s-4) var(--s-4)">${esc(a)}</p></details>`).join('')}</div>
      ${UI.btn({ label: 'Skriv til support', variant: 'outline', full: true, icon: 'chat', action: 'toast', attr: { 'data-msg': 'Support svarer typisk inden for 24 timer' } })}
    </div></div>`
  });

  S.notfound = () => ({
    html: `${UI.topbar({ title: '', back: true })}<div class="content">${UI.empty({ icon: 'search', title: 'Siden findes ikke', text: 'Måske er varen solgt eller linket forkert.', cta: UI.btn({ label: 'Til forsiden', href: '#/home' }) })}</div>`
  });

  /* ======================= SHEETS ======================= */
  window.Sheets = {
    filter() {
      const f = App.state.filters;
      return UI.sheet({
        title: 'Sortér og filtrer',
        body: `<div class="stack gap-6">
          <section class="stack gap-3"><h3 class="t-h3">Sortér efter</h3><div class="row-flex gap-2" style="flex-wrap:wrap">${[['new', 'Nyeste'], ['low', 'Laveste pris'], ['high', 'Højeste pris']].map(([v, l]) => UI.chip(l, { action: 'sheet-sort', value: v, active: f.sort === v })).join('')}</div></section>
          <section class="stack gap-3"><h3 class="t-h3">Stand</h3><div class="row-flex gap-2" style="flex-wrap:wrap">${['Ny med mærke', 'Som ny', 'Næsten ny', 'God men brugt'].map((c) => UI.chip(c, { action: 'sheet-cond', value: c, active: f.cond.has(c) })).join('')}</div></section>
          <section class="stack gap-3"><div class="row-flex" style="justify-content:space-between"><h3 class="t-h3">Maks. pris</h3><b class="t-price" id="maxLbl">${f.max >= 2000 ? 'Ingen grænse' : kr(f.max)}</b></div><input type="range" id="max" min="50" max="2000" step="50" value="${f.max}" style="width:100%;accent-color:var(--forest);height:32px"></section>
        </div>`,
        foot: UI.btn({ label: 'Nulstil', variant: 'outline', action: 'reset-filters', attr: { style: 'flex:1' } }) + UI.btn({ label: 'Vis resultater', action: 'close-sheet', attr: { style: 'flex:1.6' } })
      });
    },
    offer(id) {
      const it = item(id);
      return UI.sheet({
        title: 'Giv et bud',
        body: `<div class="stack gap-4">
          <div class="row-flex gap-3">${UI.ph(it, 'sq').replace('class="ph', 'style="width:56px;border-radius:12px" class="ph')}<div class="grow"><b>${esc(it.title)}</b><div class="t-small t-muted">Udbudspris ${kr(it.price)}</div></div></div>
          <div class="row-flex gap-2">${[[0, 'Udbudspris'], [10, '−10 %'], [20, '−20 %']].map(([p, l]) => UI.chip(l, { action: 'offer-pct', value: p, size: 'sm' })).join('')}</div>
          ${UI.field({ label: 'Dit bud', id: 'offerAmt', suffix: 'kr.', inputmode: 'numeric', value: String(Math.round(it.price * .9)), required: true, hint: 'Sælger svarer typisk inden for en time' })}
          ${UI.notice('Dit bud er først bindende, når sælger accepterer. Du betaler først bagefter.', 'info')}
        </div>`,
        foot: UI.btn({ label: 'Send bud', size: 'lg', full: true, action: 'send-offer', attr: { 'data-id': id } })
      });
    },
    share() {
      return UI.sheet({ title: 'Del annonce', body: `<div class="list" style="margin:0">${[['mail', 'Send i en besked'], ['share', 'Kopiér link'], ['user', 'Del på sociale medier']].map(([i, t]) => UI.row({ icon: i, title: t, action: 'toast', value: '' }).replace('data-action="toast"', 'data-action="share-do" data-msg="' + (i === 'share' ? 'Link kopieret' : 'Delt') + '"')).join('')}</div>` });
    },
    report() {
      return UI.sheet({ title: 'Hvad vil du gøre?', body: `<div class="list" style="margin:0">${[['flag', 'Rapportér', false], ['user', 'Blokér bruger', false], ['help', 'Få hjælp', false]].map(([i, t]) => UI.row({ icon: i, title: t, action: 'share-do', value: '' }).replace('data-action="share-do"', 'data-action="share-do" data-msg="' + t + ' – tak, vi kigger på det"')).join('')}</div>` });
    },
    payout() {
      return UI.sheet({ title: 'Udbetal til bank', body: `<div class="stack gap-4">${UI.field({ label: 'Beløb', id: 'po', suffix: 'kr.', value: String(D.me.balance), inputmode: 'numeric', required: true, hint: 'Udbetaling tager 1–2 bankdage' })}${UI.notice('Pengene sendes til Danske Bank •••• 5521', 'bank')}</div>`, foot: UI.btn({ label: 'Bekræft udbetaling', size: 'lg', full: true, action: 'share-do', attr: { 'data-msg': 'Udbetaling bestilt' } }) });
    }
  };
  window.Screens = S;
})();
