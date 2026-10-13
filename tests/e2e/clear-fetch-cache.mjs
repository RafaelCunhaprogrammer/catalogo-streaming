// Apaga as respostas do TMDB simulado que o Next.js guardou, para mudanças nos fixtures valerem.
import { rmSync } from 'node:fs';

rmSync(new URL('../../.next/cache/fetch-cache', import.meta.url), { recursive: true, force: true });
