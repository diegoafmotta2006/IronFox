# IronFox

Aplicativo web (PWA) para registrar treinos de academia, com tema escuro, visual minimalista e funcionamento offline. Os dados ficam no próprio aparelho e, opcionalmente, são sincronizados entre dispositivos com uma conta Google.

**Versão atual:** 5.7.1
**App publicado:** https://iroxfox-f3b91.web.app

## Recursos

- Calendário mensal minimalista com navegação entre meses e botão "Hoje".
- Um registro por dia, com status automático: dias passados sem treino aparecem como "Descanso"; hoje e dias futuros como "Pendente".
- Seleção múltipla de grupos musculares por dia, com "Repetir último treino".
- Anotação de exercícios por série (repetições e peso) e peso corporal do dia.
- Gráfico de evolução (peso corporal ou maior carga por exercício) e resumo do mês (treinos, faltas e melhor sequência).
- Funciona offline como PWA instalável; os dados ficam no `localStorage`.
- Sincronização opcional via Firebase Authentication (Google) + Cloud Firestore, com resolução por `updatedAt` e lápides para remoções.

## Como rodar localmente

O app é 100% estático: não há build nem `npm install`. Basta servir a pasta por HTTP.

```bash
cd IronFox-main
python3 -m http.server 8080 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8080/` no navegador. Em produção, qualquer hospedagem estática (Firebase Hosting, GitHub Pages etc.) funciona.

> O service worker guarda os arquivos em cache. Se uma alteração não aparecer, use `scripts/bump-version.mjs` para trocar a versão dos arquivos e recarregue.

## Instalar no celular

1. Abra o app no Chrome (HTTPS ou `http://127.0.0.1`).
2. Menu (⋮) → **Adicionar à tela inicial / Instalar**.
3. O app abre em tela cheia e continua funcionando sem internet.

## Estrutura

```
.
├── index.html              # App shell
├── styles.css              # Estilos (tema escuro)
├── sw.js                   # Service worker (cache offline)
├── manifest.webmanifest    # Manifesto PWA
├── version.json            # Versão usada no cache do service worker
├── icons/                  # Ícones (PWA, favicon, apple-touch)
├── scripts/
│   └── bump-version.mjs    # Troca a versão em todos os arquivos
├── src/
│   ├── app.js              # Bootstrap, rotas e service worker
│   ├── config.js           # Versão, grupos musculares, configuração
│   ├── dom.js              # Helpers de DOM
│   ├── lib/                # Firebase/Firestore, sincronização, storage
│   └── screens/            # Telas (início, dia, conta)
├── firebase.json           # Configuração do Firebase Hosting
├── .firebaserc             # Projeto Firebase padrão
└── firestore.rules         # Regras de segurança do Firestore
```

## Firebase (conta e sincronização)

O app usa o projeto Firebase `iroxfox-f3b91`:

- **Authentication:** login com Google.
- **Cloud Firestore:** um documento por dia em `users/{uid}/...`.
- **Regras:** cada usuário só lê e grava os próprios dados (`firestore.rules`).

Para publicar em outro projeto:

```bash
firebase login
firebase use <seu-projeto>
firebase deploy --only hosting,firestore:rules
```

Depois, em **Authentication → Sign-in method**, ative o provedor Google e confira em **Settings → Authorized domains** se o domínio usado está autorizado (`localhost`, `127.0.0.1` e os domínios do Hosting).

A configuração do SDK fica em `src/lib/firebase.js`.

## Versionamento

```bash
node scripts/bump-version.mjs 5.7.2
```

O script atualiza `version.json`, `index.html`, `sw.js` e `src/config.js` de forma consistente.

## Privacidade

Sem login, nenhum dado sai do aparelho. Com login, apenas os registros de treino do próprio usuário são gravados no Firestore, protegidos pelas regras de segurança.

Mais detalhes de uso estão em [LEIA-ME.txt](LEIA-ME.txt).
