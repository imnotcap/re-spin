// Statisk eksport (GitHub Pages): profilerne bygges i out/profil/<navn>/ – kopiér dem til out/@/<navn>/,
// så adressen /@/<navn> virker uden en server. (Server-bygget bruger i stedet en rewrite i next.config.mjs.)
import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../out/', import.meta.url));
if (!existsSync(`${out}profil`)) { console.error('Ingen out/profil – kør først den statiske eksport'); process.exit(1); }
cpSync(`${out}profil`, `${out}@`, { recursive: true });
console.log('Profiler kopieret til out/@/');
