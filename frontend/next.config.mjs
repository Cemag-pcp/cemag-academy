/**
 * NEXT_EXPORT=1 → site estático em out/ (Static Site do Render, servido por CDN).
 * Sem a variável (npm run dev / next build local) o Next funciona normalmente.
 * Rotas com ID (/cursos/[id], /avaliacoes/revisar/[id]) viram uma página "molde"
 * (id "_") e o Render reescreve /cursos/<id> para ela — ver render.yaml.
 */
const exportar = process.env.NEXT_EXPORT === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(exportar ? { output: 'export', trailingSlash: true } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
