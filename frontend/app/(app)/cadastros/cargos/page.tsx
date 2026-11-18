'use client'

import { CadastroPage } from '@/components/cadastros/cadastro-page'
import { CargosTab } from '@/components/cadastros/cargos-tab'

export default function CargosPage() {
  return (
    <CadastroPage titulo="Cargos" descricao="Cadastre e gerencie os cargos disponíveis na plataforma.">
      <CargosTab />
    </CadastroPage>
  )
}
