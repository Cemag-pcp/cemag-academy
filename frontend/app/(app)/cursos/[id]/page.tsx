import CursoDetailPagina from './pagina'

// Site estático: gera só a página "molde" /cursos/_/; o Render reescreve
// /cursos/<id> para ela e o ID é lido da URL no navegador (useIdDaRota).
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function CursoDetailPage() {
  return <CursoDetailPagina />
}
