# Report Expedição (dashboard-romaneios)

Dashboard web interno para acompanhamento da expedição e logística: romaneios de carga, peso bruto expedido, ocupação de veículos, entregas, caixas, comparativos entre anos e auditoria de dados.

Interface **trilíngue** (Português / English / Español), com login protegido (perfil comum e admin) e layout responsivo.

---

## Funcionalidades

- **Visão Geral:** KPIs do dia/mês, grade de veículos ordenável, gráfico de distribuição (rosca) e gráficos diários clicáveis.
- **Resumo:** tabela mensal do ano selecionado + acumulado filtrável por veículo.
- **Anos:** comparativo lado a lado de todas as métricas entre anos, com destaque para o ano corrente.
- **Acumulado:** acumulado do dia 01 até a data de corte por mês/ano.
- **Dia a Dia:** gráficos diários de peso, caixas, ocupação e veículos por mês/ano.
- **Exportar PDF:** seleção de telas, captura via html2canvas e geração em A4 landscape.
- **Painel Admin (somente admin):** auditoria de romaneios problemáticos, botão para abrir a planilha no Google Sheets e exportação de imagem para e-mail.

---

## Tecnologias

| Tecnologia | Descrição |
|---|---|
| React 18 + Vite 6 | Interface e bundler (ESM, JSX, sem TypeScript) |
| recharts | Gráficos (ComposedChart, PieChart) |
| xlsx | Leitura da planilha XLSX em memória |
| jspdf + html2canvas | Exportação de PDF e captura de telas |
| bcryptjs | Hash de senhas nas Netlify Functions |
| Netlify Functions | Backend serverless: login/logout/sessão |

---

## Arquitetura

```
Navegador (App.jsx)
  ├── login/logout → /.netlify/functions/login|logout
  │    (bcrypt vs env vars → cookie HttpOnly HMAC)
  └── loop de 10s enquanto autenticado:
        fetch do link de export XLSX da planilha (Google Sheets)
        → gate SHA-256 dos bytes (se igual, pula)
        → parseXlsx() → diff assinaturaRows() → setRows

src/
  ├── App.jsx   → toda a aplicação (estado, filtros, abas, componentes)
  ├── data.js   → parser da planilha XLSX
  ├── i18n.jsx  → internacionalização PT/EN/ES
  └── styles.css → design system (azul-marinho + dourado)
```

---

## Instalação

Requisitos: Node.js 18+.

```bash
npm install
npm run dev      # servidor de desenvolvimento (Vite)
npm run build    # build de produção → pasta dist/
npm run preview  # serve o build localmente
```

---

## Variáveis de ambiente

Necessárias para as Netlify Functions (login/sessão). Configure no painel do Netlify (Site settings → Environment variables):

| Variável | Descrição |
|---|---|
| `SESSION_SECRET` | Segredo do HMAC-SHA256 da sessão (cookie HttpOnly, TTL 60 min) |
| `SENHA_COMUM_HASH` | Hash bcrypt da senha do perfil comum |
| `SENHA_ADMIN_HASH` | Hash bcrypt da senha do perfil admin |

> **Importante:** o arquivo `.env` é ignorado pelo git e **não** vai para o repositório. Ao vincular o repositório no Netlify, configure essas variáveis manualmente, com os mesmos valores utilizados hoje. Sem elas, o login não funciona.

---

## Deploy (Netlify)

Config em `netlify.toml`: build `npm run build`, publish `dist/`, redirect SPA `/* → /index.html` (status 200).

Deploy via CLI:

```bash
npm run build
netlify deploy --prod --dir dist --functions netlify/functions
```

---

## Fonte de dados

A planilha Google Sheets precisa estar **acessível publicamente via link** ("qualquer pessoa com o link"), pois o frontend baixa o XLSX diretamente pelo link de export a cada 10s. Quem tiver o link consegue baixar os dados sem logar; a senha protege apenas a interface do dashboard.

> ⚠️ Se colunas forem renomeadas no Google Sheets, atualizar o mapa de campos em `src/data.js` (`MAPA`).

---

## Documentação

- **`AGENTS.md`** — documentação mestre (arquitetura, regras de negócio, convenções de código, changelog). Leia antes de qualquer alteração.
- **`planner.md`** — backlog oficial de funcionalidades desejadas e pendências.

---

## Contribuir

1. Leia o `AGENTS.md` por completo (documentação mestre).
2. Leia o `planner.md` (backlog oficial).
3. Implemente seguindo as convenções do `AGENTS.md` (estilo de código, i18n trilíngue, tema visual).
4. Atualize a documentação e o changelog ao final de cada alteração.
5. Valide com `npm run build`.

---

## Segurança

- Autenticação server-side (2026-08-24): senhas hasheadas com bcrypt em env vars da Netlify, validação apenas nas Functions, sessão via cookie HttpOnly + Secure + SameSite=Lax assinado com HMAC-SHA256, rate limit de 20 tentativas/10 min por IP no login.
- **Atenção:** os dados da planilha são públicos via link (decisão de performance de 2026-08-25). A senha protege apenas a interface.
- Nunca commitar segredos (`.env`, senhas, tokens). Manter tudo em env vars.

---

## Licença

Uso interno. Sem licença pública definida.
