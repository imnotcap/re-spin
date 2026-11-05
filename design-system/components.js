/* ==========================================================================
   re:spin — COMPONENT LIBRARY
   Små funktioner der returnerer HTML. Appen og galleriet bruger KUN disse,
   så alle skærme ser ens ud. Klasser findes i components.css.
   ========================================================================== */
(function () {
  const U = (window.UI = window.UI || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const attrs = (o) => Object.entries(o || {}).map(([k, v]) => v === false || v == null ? '' : v === true ? ' ' + k : ' ' + k + '="' + esc(v) + '"').join('');
  U.esc = esc;
  U.kr = (n) => Math.round(n).toLocaleString('da-DK') + ' kr.';
  U.fee = (price) => Math.round(price * 0.05 + 3); // køberbeskyttelse: 5 % + 3 kr.

  /* ---- Buttons ---- */
  U.btn = ({ label, variant = 'primary', size, icon, iconRight, full, href, action, id, disabled, attr = {} }) => {
    const cls = 'btn btn--' + variant + (size ? ' btn--' + size : '') + (full ? ' btn--full' : '');
    const inner = (icon ? U.icon(icon, 20) : '') + esc(label) + (iconRight ? U.icon(iconRight, 20) : '');
    const a = attrs(Object.assign({ class: cls, id, 'data-action': action, disabled }, attr));
    return href ? '<a' + a + ' href="' + href + '">' + inner + '</a>' : '<button' + (attr.type ? '' : ' type="button"') + a + '>' + inner + '</button>';
  };
  U.iconBtn = ({ icon, label, variant, href, action, dot, attr = {}, size = 24 }) => {
    const a = attrs(Object.assign({ class: 'iconbtn' + (variant ? ' iconbtn--' + variant : ''), 'aria-label': label, 'data-action': action }, attr));
    const inner = U.icon(icon, size) + (dot ? '<span class="dot"></span>' : '');
    return href ? '<a' + a + ' href="' + href + '">' + inner + '</a>' : '<button' + (attr.type ? '' : ' type="button"') + a + '>' + inner + '</button>';
  };

  /* ---- Small things ---- */
  U.chip = (label, { active, icon, action, value, href, size, tag } = {}) => {
    const cls = 'chip' + (size ? ' chip--' + size : '') + (tag ? ' chip--tag' : '');
    const a = attrs({ class: cls, 'aria-pressed': action ? String(!!active) : undefined, 'data-action': action, 'data-value': value });
    const inner = (icon ? U.icon(icon, 16) : '') + esc(label);
    return href ? '<a' + a + ' href="' + href + '">' + inner + '</a>' : '<button type="button"' + a + '>' + inner + '</button>';
  };
  U.badge = (label, tone, icon) => '<span class="badge' + (tone ? ' ' + tone.split(' ').map((t) => 'badge--' + t).join(' ') : '') + '">' + (icon ? U.icon(icon, 12) : '') + esc(label) + '</span>';
  U.avatar = (name, size, online) => {
    const v = ['', 'b', 'c', 'd'][(name || 'x').charCodeAt(0) % 4];
    return '<span class="avatar' + (size ? ' avatar--' + size : '') + (v ? ' avatar--' + v : '') + '" aria-hidden="true">' + esc((name || '?').trim()[0].toUpperCase()) + (online ? '<span class="online"></span>' : '') + '</span>';
  };
  U.rating = (v, count) => '<span class="rating">' + U.icon('star', 14) + v.toFixed(1) + (count != null ? ' <span class="count">(' + count + ')</span>' : '') + '</span>';
  U.price = (n, cls = '') => '<span class="t-price ' + cls + '">' + U.kr(n) + '</span>';

  /* ---- Placeholder image (skelet – erstattes med rigtige fotos) ---- */
  const SHADES = ['var(--ph-1)', 'var(--ph-2)', 'var(--ph-3)', 'var(--ph-4)'];
  U.ph = (item, ratio = '34') => {
    const n = item.shade != null ? item.shade : (item.id || 0);
    return '<div class="ph ph--' + ratio + '" style="--ph-bg:' + SHADES[Math.abs(n) % 4] + '" role="img" aria-label="' + esc(item.title || 'Billede') + '"></div>';
  };

  /* ---- Bars ---- */
  U.topbar = ({ title, back, left, actions = '', variant, border } = {}) => {
    const l = left || (back ? U.iconBtn({ icon: 'back', label: 'Tilbage', action: 'back' }) : (variant === 'left' ? '' : '<span class="topbar__spacer"></span>'));
    const r = actions || (variant === 'left' ? '' : '<span class="topbar__spacer"></span>');
    return '<header class="topbar' + (variant ? ' topbar--' + variant : '') + (border ? ' topbar--border' : '') + '">' + l + '<h1 class="topbar__title">' + title + '</h1>' + r + '</header>';
  };
  U.tabbar = (active, unread = 2) => {
    const t = (id, icon, label, extra = '') => '<a class="tab" href="#/' + id + '"' + (active === id ? ' aria-current="page"' : '') + '>' + U.icon(icon, 24) + '<span>' + label + '</span>' + extra + '</a>';
    return '<nav class="tabbar" aria-label="Hovednavigation">' + t('home', 'home', 'Hjem') + t('search', 'search', 'Søg') +
      '<a class="tab tab--fab" href="#/sell" aria-label="Sælg noget"><span class="fab">' + U.icon('plus', 28) + '</span></a>' +
      t('inbox', 'chat', 'Beskeder', unread ? '<span class="badge-dot">' + unread + '</span>' : '') + t('profile', 'user', 'Profil') + '</nav>';
  };
  U.searchbar = ({ placeholder = 'Søg efter tøj, brands, bolig…', value = '', id = 'q', readonlyHref, autofocus } = {}) => {
    const input = readonlyHref
      ? '<input readonly placeholder="' + esc(placeholder) + '" aria-label="Søg" data-href="' + readonlyHref + '" style="cursor:pointer">'
      : '<input id="' + id + '" type="search" enterkeyhint="search" placeholder="' + esc(placeholder) + '" value="' + esc(value) + '" aria-label="Søg"' + (autofocus ? ' data-autofocus' : '') + '>';
    return '<label class="searchbar">' + U.icon('search', 20) + input + '</label>';
  };

  /* ---- Product ---- */
  U.favBtn = (item, favs, glass = true) => {
    const on = favs && favs.has(item.id);
    return '<button type="button" class="iconbtn fav ' + (glass ? 'iconbtn--glass' : '') + '" data-action="fav" data-id="' + item.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Fjern fra favoritter' : 'Gem som favorit') + '">' + U.icon('heart', 20) + '</button>';
  };
  U.productCard = (item, favs, variant) => {
    const b = item.badge ? U.badge(item.badge[0], item.badge[1]) : '';
    return '<article class="card' + (variant === 'h' ? ' card--h' : '') + '"><a href="#/item/' + item.id + '" aria-label="' + esc(item.title) + ', ' + U.kr(item.price) + '"><div class="card__media">' + U.ph(item) + b + '</div></a>' +
      '<div class="card__fav">' + U.favBtn(item, favs) + '</div>' +
      '<a href="#/item/' + item.id + '"><div class="card__title">' + esc(item.title) + '</div><div class="card__meta">' + esc(item.brand) + ' · ' + esc(item.size) + '</div>' +
      '<div class="card__price t-price">' + U.kr(item.price) + '<small>' + U.kr(item.price + U.fee(item.price)) + ' inkl.</small></div></a></article>';
  };
  U.productGrid = (items, favs) => '<div class="grid-2">' + items.map((i) => U.productCard(i, favs)).join('') + '</div>';
  U.productRow = (item, trailing = '') => '<a class="card--row" href="#/item/' + item.id + '"><div class="card__media" style="width:64px;border-radius:12px">' + U.ph(item, 'sq') + '</div><div class="grow"><div class="card__title" style="margin:0">' + esc(item.title) + '</div><div class="card__meta">' + esc(item.brand) + ' · ' + esc(item.size) + '</div></div>' + trailing + '</a>';
  U.category = (c, href) => '<a class="cat" href="' + (href || '#/category/' + c.id) + '"><span class="cat__icon">' + U.icon(c.icon, 28) + '</span>' + esc(c.label) + '</a>';
  U.sectionHead = (title, linkLabel, href) => '<div class="section-head"><h2 class="t-h2">' + esc(title) + '</h2>' + (linkLabel ? '<a href="' + href + '">' + esc(linkLabel) + '</a>' : '') + '</div>';

  /* ---- Forms ---- */
  U.field = ({ label, id, type = 'text', placeholder = '', value = '', hint, error, icon, suffix, required = true, inputmode, autocomplete, attr = {} }) =>
    '<div class="field' + (error ? ' field--error' : '') + (icon ? ' field--icon' : '') + '">' + (label ? '<label class="field__label" for="' + id + '">' + esc(label) + (required ? '' : ' <span class="t-muted" style="font-weight:400">(valgfri)</span>') + '</label>' : '') +
      '<div class="field__control">' + (icon ? U.icon(icon, 20) : '') + (suffix ? '<div class="input-affix">' : '') +
      '<input class="input" id="' + id + '" name="' + id + '" type="' + type + '" placeholder="' + esc(placeholder) + '" value="' + esc(value) + '"' + (inputmode ? ' inputmode="' + inputmode + '"' : '') + (autocomplete ? ' autocomplete="' + autocomplete + '"' : '') + attrs(attr) + '>' +
      (suffix ? '<span>' + esc(suffix) + '</span></div>' : '') + '</div>' + (hint || error ? '<span class="field__hint">' + esc(error || hint) + '</span>' : '') + '</div>';
  U.select = ({ label, id, options, value, placeholder = 'Vælg…', required = true }) =>
    '<div class="field">' + (label ? '<label class="field__label" for="' + id + '">' + esc(label) + (required ? '' : ' <span class="t-muted" style="font-weight:400">(valgfri)</span>') + '</label>' : '') +
      '<select class="select" id="' + id + '"><option value="" disabled' + (value ? '' : ' selected') + '>' + esc(placeholder) + '</option>' + options.map((o) => '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
  U.textarea = ({ label, id, placeholder, value = '', hint }) =>
    '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + '</label><textarea class="textarea" id="' + id + '" placeholder="' + esc(placeholder || '') + '">' + esc(value) + '</textarea>' + (hint ? '<span class="field__hint">' + esc(hint) + '</span>' : '') + '</div>';
  U.toggle = ({ id, checked, label }) => '<span class="toggle"><input type="checkbox" role="switch" id="' + id + '"' + (checked ? ' checked' : '') + ' aria-label="' + esc(label) + '"><i></i></span>';
  U.checkbox = ({ id, label, checked }) => '<label class="check"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  U.optcard = ({ name, value, title, sub, icon, right, checked }) =>
    '<label class="optcard"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>' + (icon ? '<span class="lrow__icon">' + U.icon(icon, 22) + '</span>' : '') +
      '<span class="grow"><span class="t-bold" style="display:block">' + esc(title) + '</span>' + (sub ? '<span class="t-small t-muted">' + esc(sub) + '</span>' : '') + '</span>' + (right ? '<span class="t-bold">' + right + '</span>' : '') + '</label>';
  U.segmented = (items, active, action = 'seg') => '<div class="seg" role="tablist">' + items.map(([id, label]) => '<button type="button" role="tab" data-action="' + action + '" data-value="' + id + '" aria-selected="' + (id === active) + '">' + esc(label) + '</button>').join('') + '</div>';
  U.tabs = (items, active, action = 'tab') => '<div class="tabs" role="tablist">' + items.map(([id, label]) => '<button type="button" role="tab" data-action="' + action + '" data-value="' + id + '" aria-selected="' + (id === active) + '">' + esc(label) + '</button>').join('') + '</div>';

  /* ---- Lists ---- */
  U.row = ({ icon, title, sub, trailing, href, action, danger, value, chevron = true }) => {
    const a = attrs({ class: 'lrow' + (danger ? ' lrow--danger' : ''), 'data-action': action, 'data-value': value });
    const inner = (icon ? '<span class="lrow__icon">' + U.icon(icon, 20) + '</span>' : '') + '<span class="grow"><span class="lrow__title" style="display:block">' + esc(title) + '</span>' + (sub ? '<span class="lrow__sub">' + esc(sub) + '</span>' : '') + '</span>' + (trailing || '') + (chevron && !trailing ? U.icon('next', 20) : '');
    return href ? '<a' + a + ' href="' + href + '">' + inner + '</a>' : (action || !trailing) ? '<button type="button"' + a + '>' + inner + '</button>' : '<div' + a + '>' + inner + '</div>';
  };
  U.list = (rows) => '<div class="list">' + rows.join('') + '</div>';
  U.convo = (c) => '<a class="convo' + (c.unread ? ' convo--unread' : '') + '" href="#/chat/' + c.id + '">' + U.avatar(c.name, '', c.online) + '<div class="convo__body"><div class="convo__top"><span class="t-bold">' + esc(c.name) + '</span><span class="t-caption t-muted">' + esc(c.time) + '</span></div><div class="convo__preview">' + esc(c.preview) + '</div><div class="t-caption t-muted">' + esc(c.item) + '</div></div>' + (c.unread ? '<span class="unread" aria-label="Ulæst"></span>' : '') + '</a>';

  /* ---- Feedback ---- */
  U.empty = ({ icon = 'heart', title, text, cta }) => '<div class="empty"><div class="empty__icon">' + U.icon(icon, 40) + '</div><h2 class="t-h2">' + esc(title) + '</h2><p class="t-muted">' + esc(text) + '</p>' + (cta || '') + '</div>';
  U.notice = (text, icon = 'shield', warn) => '<div class="notice' + (warn ? ' notice--warn' : '') + '">' + U.icon(icon, 20) + '<div>' + text + '</div></div>';
  U.progress = (pct) => '<div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>';
  U.stepper = (n, total) => '<div class="stepper" aria-label="Trin ' + n + ' af ' + total + '">' + Array.from({ length: total }, (_, i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</div>';
  U.timeline = (steps) => '<ol class="timeline">' + steps.map((s) => '<li class="' + (s.state || '') + '"><i>' + U.icon('check', 14) + '</i><b>' + esc(s.title) + '</b><span>' + esc(s.sub || '') + '</span></li>').join('') + '</ol>';
  U.sum = (rows, total) => '<div class="sum">' + rows.map(([a, b]) => '<div><span class="t-muted">' + esc(a) + '</span><span>' + b + '</span></div>').join('') + (total ? '<div class="total"><span>' + esc(total[0]) + '</span><span>' + total[1] + '</span></div>' : '') + '</div>';
  U.sheet = ({ title, body, foot }) => '<div class="backdrop" data-action="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet__handle"></div><div class="sheet__head"><h2 class="t-h2">' + esc(title) + '</h2>' + U.iconBtn({ icon: 'close', label: 'Luk', action: 'close-sheet' }) + '</div><div class="sheet__body">' + body + '</div>' + (foot ? '<div class="sheet__foot">' + foot + '</div>' : '') + '</div>';
  U.bubble = (text, dir = 'in', time = '') => '<div class="bubble bubble--' + dir + '">' + esc(text) + (time ? '<div class="bubble__time">' + time + '</div>' : '') + '</div>';
})();
