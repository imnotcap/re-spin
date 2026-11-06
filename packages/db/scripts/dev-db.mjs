// Lokal udviklingsdatabase uden Docker: PGlite (rigtig PostgreSQL i WASM) som Postgres-server med alle migrationer.
// KUN til udvikling og test. Data ligger i hukommelsen (eller i PGLITE_DIR, hvis sat).
//   npm run db:dev        →  DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 5433);
const db = new PGlite(process.env.PGLITE_DIR);
await migrate(drizzle(db), { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 10 });
await server.start();
console.log(`dev-db klar: postgres://postgres@127.0.0.1:${port}/postgres`);
const stop = async () => { await server.stop(); await db.close(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
