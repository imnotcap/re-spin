// Kører databasemigreringerne (packages/db/migrations) mod DATABASE_URL_MIGRATE (eller DATABASE_URL).
// Brug en bruger med ret til at ændre skemaet – IKKE appens begrænsede bruger. Idempotent: kørte migreringer springes over.
//   DATABASE_URL_MIGRATE=postgres://…?sslmode=require npm run migrate -w @respin/db
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Sæt DATABASE_URL_MIGRATE (eller DATABASE_URL) til databasen, der skal migreres.');
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.log('Migreringer kørt.');
} catch (e) {
  // Kun beskeden – aldrig forbindelses-URL'en (indeholder adgangskoden)
  console.error('Migrering fejlede:', e instanceof Error ? e.message : 'ukendt fejl');
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
