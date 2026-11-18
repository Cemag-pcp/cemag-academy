'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, KeyRound, Loader2, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { updateProfile, updateAvatar, changePassword } from '@/lib/use-configuracoes'
import { useCargos } from '@/lib/use-cargos'

export function ConfiguracoesView() {
  const { user, refreshUser } = useAuth()
  const { cargos: cargoOpts, fetchCargos: loadCargos } = useCargos()

  useEffect(() => { loadCargos() }, [loadCargos])

  // Perfil
  const [nome, setNome] = useState(user?.nome ?? '')
  const [cargo, setCargo] = useState(user?.cargo ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Senha
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Notificações (UI-only preferences)
  const [notifCurso, setNotifCurso] = useState(true)
  const [notifPrazo, setNotifPrazo] = useState(true)
  const [notifAvaliacao, setNotifAvaliacao] = useState(true)
  const [notifCertificado, setNotifCertificado] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)

  // Empresa (RH only, UI-only)
  const [nomeEmpresa, setNomeEmpresa] = useState('CEMAG Indústria e Comércio de Máquinas Agrícolas')
  const [prazoDefault, setPrazoDefault] = useState('30')
  const [notaMinimaDefault, setNotaMinimaDefault] = useState('70')
  const [tentativasDefault, setTentativasDefault] = useState('2')

  async function handleSaveProfile() {
    if (!nome.trim()) { toast.error('O nome não pode estar vazio.'); return }
    setSavingProfile(true)
    try {
      await updateProfile({ nome: nome.trim(), cargo: cargo.trim() })
      await refreshUser()
      toast.success('Perfil atualizado com sucesso.')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Foto (liberada para todos os perfis)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const [savingFoto, setSavingFoto] = useState(false)

  async function handleFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Envie uma imagem JPG ou PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 2 MB.')
      return
    }
    setSavingFoto(true)
    try {
      await updateAvatar(file)
      await refreshUser()
      toast.success('Foto atualizada.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar a foto.')
    } finally {
      setSavingFoto(false)
    }
  }

  async function handleChangePassword() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação de senha não confere.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast.success('Senha alterada com sucesso.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      const detail = e?.message ?? 'Erro ao alterar senha.'
      toast.error(detail.includes('old_password') ? 'Senha atual incorreta.' : detail)
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  // Usuário básico só visualiza os dados; a única alteração permitida é a foto
  const somenteLeitura = user.role === 'colaborador'

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
          <TabsTrigger value="senha">Senha</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          {user.role === 'rh' && <TabsTrigger value="empresa">Empresa</TabsTrigger>}
          {user.role === 'rh' && <TabsTrigger value="seguranca">Segurança</TabsTrigger>}
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Pessoais</CardTitle>
              <CardDescription>
                {somenteLeitura
                  ? 'Seus dados cadastrais são mantidos pelo RH. Você pode alterar apenas a sua foto.'
                  : 'Atualize seus dados cadastrais na plataforma.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="Foto do perfil" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-bold">
                    {user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFotoSelecionada}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={savingFoto}
                    onClick={() => fotoInputRef.current?.click()}
                  >
                    {savingFoto && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {savingFoto ? 'Enviando…' : 'Alterar foto'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG — máx 2 MB</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>Nome completo</Label>
                  <Input
                    className={somenteLeitura ? 'mt-1 bg-muted/40' : 'mt-1'}
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    disabled={somenteLeitura}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label>Cargo</Label>
                  {somenteLeitura ? (
                    <Input className="mt-1 bg-muted/40" value={user.cargo} disabled />
                  ) : (
                    <SearchableSelect
                      className="mt-1"
                      value={cargo}
                      onValueChange={setCargo}
                      options={cargoOpts.filter(c => c.ativo).map(c => ({ value: c.nome, label: c.nome }))}
                      placeholder="Selecione um cargo"
                      searchPlaceholder="Buscar cargo..."
                      emptyText="Nenhum cargo encontrado."
                    />
                  )}
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label>E-mail do supervisor</Label>
                  <Input className="mt-1 bg-muted/40" value={user.email} disabled />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label>Departamento</Label>
                  <Input className="mt-1 bg-muted/40" value={user.departamento} disabled />
                </div>
              </div>
              {somenteLeitura ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  Precisa corrigir algum dado? Procure o RH.
                </p>
              ) : (
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                    <Save className="w-4 h-4" />
                    {savingProfile ? 'Salvando…' : 'Salvar alterações'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Senha */}
        <TabsContent value="senha" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alterar Senha</CardTitle>
              <CardDescription>Escolha uma senha forte com pelo menos 8 caracteres.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Senha atual</Label>
                <Input
                  className="mt-1"
                  type="password"
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Separator />
              <div>
                <Label>Nova senha</Label>
                <Input
                  className="mt-1"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">Mínimo de 8 caracteres.</p>
              </div>
              <div>
                <Label>Confirmar nova senha</Label>
                <Input
                  className="mt-1"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPassword} className="gap-2">
                  <KeyRound className="w-4 h-4" />
                  {savingPassword ? 'Alterando…' : 'Alterar senha'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferências de Notificação</CardTitle>
              <CardDescription>Escolha quais notificações deseja receber na plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { label: 'Novas trilhas atribuídas', desc: 'Notificar quando uma nova trilha for atribuída a você', value: notifCurso, set: setNotifCurso },
                { label: 'Prazos se aproximando', desc: 'Alerta 15 dias antes do vencimento de uma trilha', value: notifPrazo, set: setNotifPrazo },
                { label: 'Avaliações para revisar', desc: 'Notificar quando houver respostas abertas aguardando revisão', value: notifAvaliacao, set: setNotifAvaliacao },
                { label: 'Certificados emitidos', desc: 'Notificar quando um novo certificado for emitido', value: notifCertificado, set: setNotifCertificado },
                { label: 'Notificações por e-mail', desc: 'Receber resumo diário por e-mail corporativo', value: notifEmail, set: setNotifEmail },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch checked={n.value} onCheckedChange={n.set} disabled={somenteLeitura} />
                </div>
              ))}
              {!somenteLeitura && (
                <div className="flex justify-end pt-2">
                  <Button onClick={() => toast.success('Preferências salvas.')} className="gap-2">
                    <Save className="w-4 h-4" />
                    Salvar preferências
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Empresa (somente RH) */}
        {user.role === 'rh' && (
          <TabsContent value="empresa" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações da Empresa</CardTitle>
                <CardDescription>Parâmetros globais aplicados a todas as trilhas e usuários.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome da empresa</Label>
                  <Input className="mt-1" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} />
                </div>
                <Separator />
                <p className="text-sm font-medium text-foreground">Padrões de Trilhas</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Prazo padrão (dias)</Label>
                    <Input className="mt-1" type="number" value={prazoDefault} onChange={e => setPrazoDefault(e.target.value)} />
                  </div>
                  <div>
                    <Label>Nota mínima padrão (%)</Label>
                    <Input className="mt-1" type="number" value={notaMinimaDefault} onChange={e => setNotaMinimaDefault(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tentativas padrão</Label>
                    <Input className="mt-1" type="number" value={tentativasDefault} onChange={e => setTentativasDefault(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => toast.success('Configurações salvas.')} className="gap-2">
                    <Save className="w-4 h-4" />
                    Salvar configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Segurança (somente RH) */}
        {user.role === 'rh' && (
          <TabsContent value="seguranca" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segurança e Acesso</CardTitle>
                <CardDescription>Configurações de segurança da plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { label: 'Autenticação em dois fatores (2FA)', desc: 'Exigir 2FA para todos os usuários RH e Gestores', enabled: false },
                  { label: 'Timeout de sessão', desc: 'Encerrar sessão após 8 horas de inatividade', enabled: true },
                  { label: 'Log de acesso completo', desc: 'Registrar todas as ações de usuários no log de auditoria', enabled: true },
                  { label: 'Restrição por IP', desc: 'Limitar acesso à rede interna CEMAG', enabled: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} onCheckedChange={() => {}} />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={() => toast.success('Configurações salvas.')} className="gap-2">
                    <Save className="w-4 h-4" />
                    Salvar configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
