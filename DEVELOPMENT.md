# Desenvolvimento Local - Link Livre

## Quick Start (sem Firebase)

```bash
npm install
npm run dev
```

O app abrirá em `http://localhost:5173` em **Modo Local**.

Na tela de login, você verá:
- Logo do app (se /assets/logo.svg existir)
- Mensagem "Firebase ainda não está configurado"
- Instruções para habilitar autenticação

Neste modo, você pode explorar a interface, mas login e sincronização não funcionarão.

## Com Firebase (autenticação real)

1. **Crie um projeto no Firebase Console:**
   - https://console.firebase.google.com/
   - Crie um novo projeto ou use um existente

2. **Copie as credenciais:**
   - Vá em Configurações do Projeto → SDK do Firebase
   - Copie os valores das variáveis

3. **Configure o .env:**
   ```bash
   cp .env.example .env
   ```

4. **Preencha o arquivo .env:**
   ```
   VITE_FIREBASE_API_KEY=sua_api_key_aqui
   VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
   ... (complete com seus valores)
   ```

5. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

Agora o app terá autenticação real e sincronização com Firestore.

## Solução de Problemas

### Tela branca ao abrir o app

**Causa:** Erro durante inicialização. Verifique o console do navegador (F12).

**Solução:**
1. Abra o developer tools (F12 / Cmd+Opt+I)
2. Vá para a aba "Console"
3. Procure por erros vermelhos
4. Se o Firebase não estiver configurado (esperado), a interface deve abrir normalmente
5. Se houver erro, reporte

### Favicon não aparece

**Causa:** Cache do navegador ou arquivo não encontrado.

**Solução:**
- Hard refresh: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- Limpe o cache: Developer Tools → Application → Clear Storage
- Use aba Anônima para testar

### Logo não aparece

**Causa:** Arquivo `/public/assets/logo.svg` não encontrado.

**Solução:**
- A interface continua funcionando mesmo sem logo (mostra apenas texto "Link Livre")
- Para adicionar logo real, coloque arquivo em `/public/assets/logo.svg` ou `/public/assets/logo.png`
- O app prioriza SVG e fallback para PNG

## Estrutura de Assets

```
/public/assets/
  logo.svg       (ou logo.png)    - Logo principal
  favicon.svg    (ou favicon.png) - Ícone do app
  README.txt     - Instruções
```

Já vem com placeholders SVG. Você pode substituir pelos arquivos reais.

## Modo Local vs. Modo Firebase

### Local Mode (sem .env ou Firebase inválido)
- ✅ Interface renderiza normalmente
- ✅ Login mostra mensagem de configuração
- ✅ Permite explorar layout e UX
- ❌ Sem autenticação real
- ❌ Sem sincronização com backend

### Firebase Mode (com .env preenchido)
- ✅ Autenticação real
- ✅ Sincronização de dados
- ✅ Funcionalidade completa
- ❌ Requer credenciais válidas

## Build para Produção

```bash
npm run build
npm run preview
```

O build gerado estará em `/dist`.

## Mais Informações

- [Documentação Firebase](https://firebase.google.com/docs)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
