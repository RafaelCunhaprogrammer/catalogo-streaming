import { createAuthClient } from 'better-auth/react';

// Login no navegador (formulários de entrar, criar conta, senha).
export const authClient = createAuthClient({ basePath: '/api/auth' });
