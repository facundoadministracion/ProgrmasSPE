/** @type {import('next').NextConfig} */
const nextConfig = {
  // Este ajuste es CRÍTICO para solucionar el error "Turbopack build failed"
  // y "Next.js inferred your workspace root" en entornos virtuales.
  experimental: {
    turbopack: {
      // Al establecer 'root' a null, forzamos a Turbopack a reconocer 
      // la raíz del proyecto como el directorio donde se encuentra este archivo.
      root: null, 
    },
  },
  
  // Si tienes otras configuraciones en tu next.config.js, puedes añadirlas aquí.
  // Ejemplo:
  // images: {
  //   domains: ['tu-storage-bucket.appspot.com'],
  // },
  
  // Si usas el App Router:
  // reactStrictMode: true,
};

module.exports = nextConfig;