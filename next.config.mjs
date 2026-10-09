/** @type {import('next').NextConfig} */
const nextConfig = {
  // Modelo de cache tradicional: fetch com { next: { revalidate } }, como a especificação define.
  cacheComponents: false,
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
