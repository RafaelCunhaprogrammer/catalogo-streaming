/** @type {import('next').NextConfig} */
const nextConfig = {
  // Modelo de cache tradicional: fetch com { next: { revalidate } }, como a especificação define.
  cacheComponents: false,
  // O PGlite carrega WebAssembly e não deve ser empacotado.
  serverExternalPackages: ['@electric-sql/pglite'],
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
