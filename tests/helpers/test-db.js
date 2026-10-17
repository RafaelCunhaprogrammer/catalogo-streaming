import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import { runMigrations } from '@/lib/db/migrate';

// Iniciar o PGlite leva alguns segundos: montamos um banco modelo já migrado uma vez
// por arquivo de teste e cada teste recebe um clone limpo dele (bem mais rápido).
let template;
function getTemplate() {
  if (!template) {
    template = (async () => {
      const client = new PGlite();
      await runMigrations({ db: drizzle(client, { schema }), client, kind: 'pglite' });
      return client;
    })();
  }
  return template;
}

// Banco PostgreSQL em memória (PGlite), com todas as migrações aplicadas.
export async function createTestDb() {
  const client = await (await getTemplate()).clone();
  return drizzle(client, { schema });
}
