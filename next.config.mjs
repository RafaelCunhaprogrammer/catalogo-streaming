// Cabeçalhos de segurança em todas as respostas. A CSP aqui só trava quem pode abrir o site num
// iframe (clickjacking nas telas de PIN e de conta), o <base> e o destino dos formulários; scripts e
// estilos ficam de fora, porque uma CSP de scripts no Next pede nonce por requisição (via proxy).
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // Modelo de cache tradicional: fetch com { next: { revalidate } }, como a especificação define.
  cacheComponents: false,
  // Sem o indicador "Rendering" no canto da tela durante o desenvolvimento (erros continuam aparecendo).
  devIndicators: false,
  // O PGlite carrega WebAssembly e não deve ser empacotado.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Não leva dados locais, testes nem documentos para dentro das funções publicadas.
  outputFileTracingExcludes: {
    '/*': ['.data/**', '.next/cache/**', 'test-results/**', 'tests/**', 'docs/**'],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
