# 🌱 myGarden - Notificações Automáticas

## Problema Resolvido ✅

**Antes:** As notificações só chegavam quando a app estava aberta.
**Depois:** As notificações chegam automaticamente a cada 10 minutos, mesmo com a app fechada!

---

## Como Funciona

Uma função Netlify agendada (Cron Job) roda **automaticamente a cada 10 minutos**:

```
Timer → check-notifications.js → Supabase → ntfy.sh → Notificação no telemóvel ✓
```

**Sem depender do frontend estar aberto!**

---

## 🚀 Implementação Rápida (3 passos)

### 1. Executar SQL no Supabase
- Abre [Supabase Dashboard](https://supabase.com/dashboard)
- SQL Editor > New Query
- Copia todo o conteúdo de `supabase/schema.sql`
- Executa (Ctrl+Enter)

### 2. Configurar Variáveis no Netlify
- Netlify Dashboard > Site settings > Environment
- Adiciona:
  - `SUPABASE_URL` = [teu URL]
  - `SUPABASE_ANON_KEY` = [tua chave]

### 3. Deploy
```bash
git add .
git commit -m "Implementar notificações automáticas"
git push
```

---

## 🧪 Teste Rápido

```bash
npm run dev
node test-notifications.js
```

Deverá responder com JSON confirmando as notificações.

---

## 📋 O Que Foi Adicionado

| Ficheiro | Descrição |
|---|---|
| `netlify/functions/check-notifications.js` | ⭐ Função principal (Cron Job) |
| `supabase/schema.sql` | Tabela `notifications_log` adicionada |
| `netlify.toml` | Agendamento Cron configurado |
| `NOTIFICACOES.md` | Documentação técnica |
| `SETUP_NOTIFICACOES.md` | Guia passo-a-passo |
| `test-notifications.js` | Script de teste |

---

## 📊 Resultado

```
✓ Notificações automáticas
✓ Funciona mesmo com app fechada
✓ Histórico de notificações guardado
✓ Controlo de spam automático
✓ Sem erros de autenticação
```

---

## 📚 Documentação

- **NOTIFICACOES.md** - Documentação técnica completa
- **SETUP_NOTIFICACOES.md** - Guia de implementação passo-a-passo
- **IMPLEMENTACAO_COMPLETA.txt** - Resumo visual completo

---

## ❓ Problemas?

Consulta `SETUP_NOTIFICACOES.md` → Troubleshooting para soluções rápidas.

---

**Pronto para deploy! 🚀**

