# Fluxo de Avaliação com Questões Abertas

## 📋 Como Funciona

### 1. **Aluno Submete a Avaliação**

Quando um aluno envia uma avaliação que contém questões abertas:

- **Questões Objetivas**: São corrigidas automaticamente
- **Questões Abertas**: Ficam aguardando revisão manual
- **Status**: Muda para `PENDENTE` (pendente de revisão)
- **Certificado**: NÃO é gerado automaticamente

**Resposta da API:**
```json
{
  "status": "em_andamento",
  "status_avaliacao": "pendente",
  "nota_avaliacao": 7.5,  // Nota parcial (só questões objetivas)
  "respostas_abertas": [
    {
      "questao_id": "uuid-123",
      "resposta": "Resposta do aluno...",
      "peso": 2.0
    }
  ],
  "message": "Avaliação enviada para revisão. Aguarde a correção das questões abertas pelo gestor."
}
```

---

### 2. **Gestor/RH Revisa as Questões Abertas**

O gestor acessa o endpoint de feedback para corrigir as questões abertas:

**Endpoint:** `PATCH /api/v1/progress/{progress_id}/feedback/`

**Payload de Exemplo:**
```json
{
  "respostas_abertas_avaliadas": [
    {
      "questao_id": "uuid-123",
      "resposta": "Resposta do aluno...",
      "peso": 2.0,
      "pontos_recebidos": 1.5,  // Pontos dados pelo gestor (de 0 até peso)
      "feedback": "Boa resposta, mas faltou mencionar X"
    },
    {
      "questao_id": "uuid-456",
      "resposta": "Outra resposta...",
      "peso": 3.0,
      "pontos_recebidos": 3.0,  // Resposta perfeita
      "feedback": "Excelente! Resposta completa."
    }
  ],
  "feedback_gestor": "Parabéns pelo esforço. Continue estudando o tema X."
}
```

---

### 3. **Sistema Calcula a Nota Final**

Após o gestor enviar a avaliação:

1. **Calcula nota total** = (pontos objetivas + pontos abertas) / peso total × 10
2. **Verifica aprovação** = nota >= nota_minima_aprovacao
3. **Se aprovado**:
   - Status → `CONCLUIDO`
   - Gera certificado automaticamente
   - Marca progresso como 100%
4. **Se reprovado**:
   - Status → `REPROVADO`
   - Aluno pode tentar novamente (se houver tentativas)

---

### 4. **Aprovação/Reprovação Manual (Override)**

O gestor também pode aprovar ou reprovar manualmente:

**Payload:**
```json
{
  "status_avaliacao": "aprovado",  // ou "reprovado"
  "nota_avaliacao": 8.5,  // Nota final manual
  "feedback_gestor": "Aprovado por demonstrar conhecimento na entrevista."
}
```

---

## 🔄 Diagrama de Fluxo

```
Aluno Submete Avaliação
         ↓
[Tem questões abertas?]
         ↓
    ┌────┴────┐
   SIM       NÃO
    ↓          ↓
PENDENTE   [Aprovado?]
    ↓          ↓
Aguarda    ┌───┴────┐
Gestor    SIM      NÃO
    ↓       ↓        ↓
Gestor  CONCLUÍDO REPROVADO
Avalia     ↓
    ↓   Certificado
[Nota final?]
    ↓
┌───┴────┐
SIM     NÃO
 ↓       ↓
CONCLUÍDO REPROVADO
 ↓
Certificado
```

---

## 📊 Status Possíveis

### CourseProgress.status
- `nao_iniciado` - Não começou
- `em_andamento` - Fazendo o curso
- `concluido` - Concluído e aprovado
- `reprovado` - Reprovado na avaliação

### CourseProgress.status_avaliacao
- `pendente` - Aguardando revisão (questões abertas)
- `aprovado` - Aprovado
- `reprovado` - Reprovado

---

## 🎯 Exemplo Completo

### Cenário: Curso com 5 questões (3 objetivas + 2 abertas)

**Pesos:**
- Questão 1 (objetiva): 2.0
- Questão 2 (objetiva): 2.0
- Questão 3 (objetiva): 2.0
- Questão 4 (aberta): 2.0
- Questão 5 (aberta): 2.0
- **TOTAL**: 10.0 pontos

**Aluno acerta:**
- ✅ Questão 1: 2.0 pontos
- ✅ Questão 2: 2.0 pontos
- ❌ Questão 3: 0.0 pontos
- ⏳ Questão 4: aguardando
- ⏳ Questão 5: aguardando

**Nota parcial:** (4.0 / 10.0) × 10 = 4.0 → Status: PENDENTE

**Gestor avalia:**
- Questão 4: 1.5/2.0 pontos (75%)
- Questão 5: 2.0/2.0 pontos (100%)

**Nota final:** (4.0 + 1.5 + 2.0) / 10.0 × 10 = **7.5**

Se nota mínima = 7.0 → **APROVADO** ✅ → Certificado gerado

---

## 🔐 Permissões

- **Alunos**: Podem enviar avaliações
- **Gestores/RH**: Podem revisar questões abertas via `/feedback/`
- **Sistema**: Gera certificado automaticamente após aprovação
