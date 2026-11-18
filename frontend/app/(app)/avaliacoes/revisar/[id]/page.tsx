import RevisarAvaliacaoPagina from './pagina'

// Site estático: gera só a página "molde" /avaliacoes/revisar/_/; o Render reescreve
// /avaliacoes/revisar/<id> para ela e o ID é lido da URL no navegador (useIdDaRota).
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function RevisarAvaliacaoPage() {
  return <RevisarAvaliacaoPagina />
}
