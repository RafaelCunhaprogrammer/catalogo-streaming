// Recria o banco dos testes de ponta a ponta do zero.
import { rmSync } from 'node:fs';

rmSync(new URL('../../.data/e2e', import.meta.url), { recursive: true, force: true });
