# Instruções para Corrigir o Login Google no Vercel

## Problema
O login com Google funciona no localhost mas falha no Vercel. Isso ocorre porque o domínio do Vercel não está autorizado no Firebase Console.

## Solução

### 1. Encontre seu domínio Vercel
Seu domínio é: `barberia-9buujzmuc-doukers-projects.vercel.app`

### 2. Vá ao Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: `gen-lang-client-0087156259`
3. No menu esquerdo, clique em **Authentication** (Autenticação)
4. Vá para a aba **Settings** (Engrenagem/Configurações) no canto superior direito

### 3. Adicione o domínio autorizado
1. Procure por **Authorized domains** (Domínios autorizados)
2. Clique em **Add domain** (Adicionar domínio)
3. Digite: `barberia-9buujzmuc-doukers-projects.vercel.app`
4. Clique em **Add** (Adicionar)

### 4. Também adicione (para o futuro)
- `localhost`
- Seu domínio customizado (quando tiver um)

### 5. Aguarde 5-10 minutos
As alterações podem levar tempo para serem propagadas.

## Se continuar não funcionando
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Tente acessar o site em uma janela anônima/privada
- Verifique se não há AppCheck bloqueando (reCAPTCHA)
