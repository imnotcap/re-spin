// Tom erstatning for Next' "polyfill-module" (Array.prototype.at, flat, Object.hasOwn, trimStart …).
// Alle browsere i Next 16's mål (Chrome/Edge/Firefox 111+, Safari 16.4+) har dem indbygget, så de er
// 14 KB ren last ("Legacy JavaScript" i Lighthouse). Se turbopack.resolveAlias i next.config.mjs.
export {};
