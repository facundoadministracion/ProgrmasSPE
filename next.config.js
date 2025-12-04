/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // La configuración 'experimental.turbopack' fue eliminada.
  // Estaba causando una advertencia en la versión actual de Next.js.
  // Si se presentan problemas con Turbopack en entornos virtuales,
  // será necesario investigar la configuración equivalente para Next.js 15+.
  
  // Si tienes otras configuraciones en tu next.config.js, puedes añadirlas aquí.
  // Ejemplo:
  // images: {
  //   domains: ['tu-storage-bucket.appspot.com'],
  // },
  
  // Si usas el App Router:
  // reactStrictMode: true,
};

module.exports = nextConfig;
