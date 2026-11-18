'use client'

import { CadastroPage } from '@/components/cadastros/cadastro-page'
import { SetoresTab } from '@/components/cadastros/setores-tab'

export default function SetoresPage() {
  return (
    <CadastroPage titulo="Setores" descricao="Cadastre e gerencie os setores da empresa.">
      <SetoresTab />
    </CadastroPage>
  )
}
