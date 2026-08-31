# AGENTS.md — Documentação Mestre · Report Expedição

> ## ⚠️ ORIENTAÇÃO PERMANENTE PARA ASSISTENTES DE IA
>
> **Toda sessão de trabalho neste projeto DEVE seguir este fluxo, sem exceção:**
>
> 1. **LEIA ESTE ARQUIVO COMPLETO** antes de qualquer tarefa. Ele descreve toda a arquitetura, regras de negócio e convenções.
> 2. **LEIA `planner.md`** — é o backlog oficial de funcionalidades desejadas e pendências.
> 3. **IMPLEMENTE** a funcionalidade solicitada seguindo as convenções descritas aqui (estilo de código, i18n trilíngue, tema visual, estrutura de componentes).
> 4. **ATUALIZE A DOCUMENTAÇÃO** ao final de cada alteração:
>    - Novo componente/arquivo/regra de negócio → documente na seção correspondente abaixo.
>    - Funcionalidade concluída do `planner.md` → marque como concluída com data.
>    - Nova funcionalidade desejada pelo usuário → adicione ao `planner.md`.
>    - **Release visível ao usuário** → adicione entrada no feed `ATUALIZACOES` (App.jsx, trilíngue) **além** do changelog da seção 13. O sino lê o `ATUALIZACOES`, não este arquivo.
> 5. **VALIDE** rodando `npm run build` para garantir que não quebrou nada.
>
> Nunca presuma conhecimento desatualizado: o código muda, este arquivo é a fonte da verdade.

---

## 1. Visão Geral

**Nome:** `dashboard-romaneios` — "Report Expedição"
**Objetivo:** Dashboard web interno para acompanhamento de expedição/logística: romaneios de carga, peso bruto expedido, ocupação de veículos, entregas, caixas, comparativos entre anos e auditoria de dados.

- **Idioma padrão:** Português (PT-BR), com interface trilíngue PT/EN/ES.
- **Acesso:** protegido por senha (tela de login), com perfil comum e perfil admin.
- **Fonte de dados:** planilha Google Sheets exportada como XLSX, baixada pelo navegador.
- **Deploy:** Netlify (SPA estática).

## 2. Stack Tecnológica

| Tecnologia | Versão | Uso |
|---|---|---|
| React | ^18.3.1 | UI (sem router, sem Redux — estado local + Context apenas p/ i18n) |
| Vite | ^6.0.0 | Build/dev server (`@vitejs/plugin-react`) |
| recharts | ^2.15.0 | Gráficos (ComposedChart, PieChart) |
| xlsx | ^0.18.5 | Parse da planilha XLSX em memória |
| jspdf | ^4.2.1 | Geração de PDF |
| html2canvas | ^1.4.1 | Captura de tela das abas para o PDF || d3-scale | 4.0.2 | Escalas (dependência utilitária) |
| bcryptjs | ^3.0.3 | Hash de senha nas Netlify Functions |
| Netlify Functions | Node/Esm | Backend: login/logout + sessão (fonte em `netlify/functions/`) |

Sem TypeScript, sem ESLint/Prettier configurados, sem testes automatizados. JavaScript moderno (ESM), JSX.

## 3. Comandos

```bash
npm run dev       # servidor de desenvolvimento (Vite)
npm run build     # build de produção → pasta dist/
npm run preview   # serve o build localmente
```

## 4. Arquitetura e Fluxo de Dados

```
Navegador (App.jsx)
  ├── login/logout ──► /.netlify/functions/login|logout
  │                     (bcrypt vs env var → cookie HttpOnly HMAC)
  └── loop de 10s enquanto autenticado:
        fetch direto do link de export XLSX da planilha (Google)
        → gate SHA-256 dos bytes (se igual ao anterior, pula tudo)
        → parseXlsx() ──► diff assinaturaRows() ──► setRows
        (a planilha precisa estar acessível publicamente via link)

App.jsx (estado global do componente App)
        ├── filtros: dataSel (data exata), ano
        ├── useMemo derivados: kpis, gradeVeiculos, diasDados,
        │   detalheRows, distVeiculos, dataMax/dataMin...
        ▼
Abas (renderização condicional, sem router):
  geral | resumo | anos | acumulado | diadia | admin(só isAdmin)
```

### Formato de uma row (após parse)

```js
{
  romaneio: number, anexos: string, hora: 'HH:MM', data: Date,
  motorista: string, placa: string, regiao: string,
  peso: number, valor: number, veiculo: string, capacidade: number,
  ocupacao: string, entregas: number, destino: string,
  acrescimo: number, frete: number, adiantamento: number,
  caixas: number, caixasSF: number,
}
```

## 5. Estrutura de Arquivos (detalhado)

```
dashboard/
├── AGENTS.md            ← este arquivo (documentação mestre p/ IA)
├── planner.md           ← backlog de funcionalidades desejadas
├── .env                 ← segredos LOCAIS (nunca commitar; espelho das env vars da Netlify)
├── index.html           ← entry Vite; lang="pt-BR"; título "Report Expedição"; favicon.svg
├── package.json         ← scripts dev/build/preview; deps acima
├── vite.config.js       ← apenas plugin react()
├── netlify.toml         ← build: npm run build; publish: dist; redirect SPA /*→/index.html
├── apps-script/
│   └── Codigo.gs            LEGADO: Apps Script da planilha (cache gzip + probe) — sem uso desde 2026-08-25; mantido para eventual rollback
├── netlify/functions/   ← backend serverless (fonte versionada)
│   ├── _sessao.js           cookie HMAC-SHA256 (criarSessao/lerSessao), TTL 60 min
│   ├── login.js             POST valida senha (bcrypt) → cookie; GET restaura sessão; rate limit 20/10min por IP
│   └── logout.js            limpa cookie
├── public/              ← copiado integralmente p/ dist/
│   ├── logo.svg             logo no header e login
│   ├── logo-login.svg       variação do login
│   ├── favicon.svg
│   ├── login-bg.webp        fundo desfocado da tela de login
│   ├── bandeiras/{br,en,es}.png  seletor de idioma
│   └── arquivo.xlsx         cópia local da base (referência)
├── src/
│   ├── main.jsx         ← ReactDOM.createRoot + StrictMode + styles.css
│   ├── App.jsx          ← TODA a aplicação (~1340 linhas; ver seção 6)
│   ├── data.js          ← parser XLSX (ver seção 7)
│   ├── i18n.jsx         ← internacionalização PT/EN/ES (ver seção 8)
│   └── styles.css       ← todo o CSS (~734 linhas; ver seção 9)
├── .netlify/            ← estado local do CLI Netlify (NÃO editar à mão)
│   ├── state.json           siteId: dfb61f4a-f511-4302-a95d-3e894179c7d8
│   └── functions/*.zip      builds antigos de functions login/logout/dados
└── dist/                ← output do build (gerado, não versionar mudanças manuais)
```

> **Nota:** as env vars exigidas pelas functions: `SESSION_SECRET`, `SENHA_COMUM_HASH`,
> `SENHA_ADMIN_HASH` (bcrypt). O `.env` local espelha os mesmos valores (usado pelo
> `netlify dev` e como referência). `APPS_SCRIPT_URL`/`APPS_SCRIPT_TOKEN` continuam nas
> env vars mas estão **sem uso** desde 2026-08-25 (fonte de dados voltou ao link direto).
> ⚠️ Pastas corrompidas no disco (`node_modules_corrompido/`, `.netlify/plugins_corrompido/`)
> aguardam exclusão manual após verificação do disco (`chkdsk`).

## 6. src/App.jsx — Componentes e Regras

### 6.1 Constantes globais

| Constante | Valor / Descrição |
|---|---|
| `GOLD` / `NAVY` / `NAVY_DARK` / `WHITE` | `#C09F44` / `#003E61` / `#002B43` / `#FEFEFE` — cores do tema |
| `COLORS` | paleta de 8 cores para gráficos de pizza |
| `METRICAS` | chaves `peso, caixas, veiculos, entregas, ocupacao` + formatadores |
| `SESSAO_MS` | 60 min — expira sessão por inatividade (UX; a expiração real é no cookie do servidor) |
| `POLL_MS` | 10 s — intervalo do re-fetch da planilha |
| `URL_LOGIN` / `URL_LOGOUT` / `URL_DADOS` | endpoints `/.netlify/functions/login|logout` + link de export XLSX da planilha |
| `URL_PLANILHA` | link `/edit` da planilha no Google Sheets (aberto pelo botão do Painel Admin) |
| `PROBLEMAS` | regras de auditoria do Painel Admin (ver 6.4) |
| `ICONES_LOADING` | 5 ícones SVG animados na tela de carregamento |
| `CANONICO_VEICULOS` | nome de exibição por chave de agrupamento: `{ bitruck: 'Bi Truck', caminho34: 'Caminhão 3/4' }`. Necessário porque visões agrupadas (grade, pizza, filtro do Resumo) só têm a chave sem acentos — sem o mapa, "Caminhão 3/4" exibia como "CAMINHO34". Novos veículos com acento/símbolo no nome precisam de entrada aqui |
| `ATUALIZACOES` | feed de novidades do botão sino: array `{ data, itens: [{pt,en,es}] }` agrupado por data — uma entrada por release; itens da mesma data renderizados separados por "•". Adicionar itens à data corrente ou nova entrada a cada release visível |
| `POR_PAGINA` | 25 linhas por página na tabela de detalhes |
| `assinaturaRows(rs)` | string-assinatura das rows (romaneio/data/numéricos) p/ diff antes de setRows |
| `shaHex(texto)` | SHA-256 hex do payload cru; se igual ao anterior, pula parse/setRows |

### 6.2 Funções utilitárias

- `fmt(v)` — número pt-BR; `fmtMoney(v)` — BRL sem centavos; `fmtTon(v)` — kg→t (÷1000); `fmtPct(v)` — % com 1 decimal.
- `isoDate(d)` — `YYYY-MM-DD` local (usado nos inputs date).
- `limparVeiculo(v)` — remove prefixos regionais `"SP - "` / `"SC - "`.
- `chaveVeiculo(v)` — chave canônica minúscula sem símbolos (agrupa veículos).
- `exibirVeiculo(v)` — nome de exibição (aplica canonizações).
- `montarDias(rows, ano, mesIdx, diaMax)` — agrega por dia do mês: retorna `{peso, caixas, veiculos, ocupacao}`, cada um com `linhas[{dia, valor}]` e `media`. Ocupação usa média ponderada (Σpeso ÷ Σcapacidade dos dias com capacidade).
- `assinaturaRows(rows)` — gera uma string-assinatura do conteúdo parseado (romaneio, data e principais campos numéricos de cada linha). Usada no fetch para detectar se a planilha mudou de verdade antes de aplicar `setRows`.

### 6.3 Componentes

| Componente | Responsabilidade |
|---|---|
| `Kpi` | cartão de indicador (label, valor, sub, cor) |
| `RotuloMedia` | badge SVG do rótulo de média dos gráficos diários: retângulo arredondado (`rx=3`) com fundo na cor de destaque e texto branco; fixo no canto superior direito do gráfico (dentro da margem superior, `topo=4`), fora da área das barras para não cobrir rótulos |
| `GraficoDias` | gráfico barras diárias (recharts ComposedChart) + linha de média (ReferenceLine) com badge `RotuloMedia`; prop opcional `destaque` (número do dia) aplica `fillOpacity` reduzido nas barras dos outros dias, destacando o dia selecionado; prop opcional `aoClicar(dia)` torna as barras clicáveis (`cursor: pointer`) |
| `GradeAno` | tabela ano × meses de uma métrica, com total por linha/coluna; `ateMes` limita colunas |
| `CompararAnos` | todas as métricas lado a lado, todos os anos |
| `Acumulado` | acumulado do dia 01 até dia-de-corte em cada mês/ano; input de data (padrão = data máxima da base) |
| `DiaADia` | seletores ano+mês → 4 gráficos diários (peso, caixas, ocupação, veículos) |
| `ResumoGeral` | tabela mensal do ano + tabela acumulada filtrável por veículo |
| `Login` | formulário de senha, olho mostrar/ocultar, bandeiras de idioma, botão reportar |
| `PainelAdmin` | KPIs de problemas + tabela filtrável de romaneios problemáticos; botão "Abrir planilha" (`btn-planilha`) abre o Sheets em modo edição em nova aba (`window.open`, oculto no PDF); botão "Print E-mail" (`btn-email-print`) captura a aba Visão Geral como PNG via html2canvas (oculto no PDF) |

### 6.4 Regras de negócio — Painel Admin (`PROBLEMAS`)

Um romaneio entra na lista de auditoria se cumprir qualquer regra:

| key | Regra |
|---|---|
| `domingo` | expedição em domingo (`data.getDay() === 0`) |
| `entregas` | entregas ≤ 0 |
| `veiculo` | veículo vazio ou contém `_` |
| `capacidade` | capacidade ≤ 0 |
| `peso` | peso ≤ 0 |
| `valor` | valor ≤ 0 |

A aba Admin só aparece para quem logou com `SENHA_ADMIN`, e exibe badge com contagem de romaneios pendentes.

### 6.5 Estado e comportamento do `App`

- **Autenticação:** `autenticado` + `isAdmin`; login via POST na function (bcrypt no servidor) que define cookie HttpOnly; ao carregar a página, GET na mesma function restaura a sessão; logout chama POST `/logout` e reseta tudo.
- **Sessão:** listener de atividade (mousemove/click/keydown/touchstart/scroll); checagem a cada 30s; inativo > 60 min → volta ao login com aviso "sessão expirada".
- **Dados:** loop de 10s enquanto autenticado — baixa o XLSX direto do link público da planilha, aplica gate por SHA-256 dos bytes (se igual, pula tudo) e diff de `assinaturaRows` antes de setRows (evita re-render inútil e reset de filtros); guard contra requisições concorrentes; loading com ícones animados; erro só bloqueia se ainda não há rows.
- **Filtros da aba Geral:** `dataSel` (data exata, default = data máxima) + `ano` (default = ano máximo); botão "Limpar" aparece quando diferente do padrão. Os gráficos diários (`diasDados`) NÃO cortam no dia selecionado: o corte é sempre o último dia com dados no mês/ano da referência (`diaUltimo` varrido de `rows`); com `dataSel` ativo, `diasDados.diaSel` é passado como `destaque` ao `GraficoDias`, que esmaece (`fillOpacity` 0,88) as barras dos outros dias; clicar numa barra aplica o filtro daquele dia (`aoClicarDiaGeral`, monta a ISO a partir de `diasDados.ref`; clicar de novo na mesma barra restaura `dataMax`).
- **Grade de veículos:** colunas ordenáveis por click (mesmo padrão da tabela Detalhes: `ordenaGrade`/`ordemAscGrade`, seta ▲▼, default peso desc); a pizza de distribuição continua usando a ordem original (`gradeVeiculos.linhas`).
- **Tabela Detalhes:** ordenação por coluna (click alterna asc/desc), paginação 25/página, filtros independentes ano+mês.
- **Distribuição (pizza):** alternável entre veículos/peso/entregas/caixas (`distModo`); rosca com `innerRadius=46` / `outerRadius=84` para o rótulo externo não cortar sob o título.
- **Navegação por abas:** indicador animado medido via `useLayoutEffect` (ref `abasRef`).
- **Exportar PDF:** modal com checkboxes das telas; para cada tela selecionada troca a aba, espera 500ms, captura com html2canvas (scale 1.5, oculta `.detalhes/.sair/.paginacao/.abas-bandeiras` via classe `.oculto-no-pdf`) e adiciona página A4 no jsPDF landscape; salva como `report-expedicao.pdf`.
- **Botão "Reportar":** abre formulário Google Forms `https://forms.gle/Fpm6z8k3iwiRN2ZBA`.
- **Sino de novidades:** botão ao lado das bandeiras; abre painel dropdown com os **3 blocos de data mais recentes** do feed `ATUALIZACOES` (trilíngue); se houver mais, exibe link "Ver histórico completo" (`sino.verHistorico`) que abre modal `.historico-modal` com o feed inteiro em blocos de data (rolagem própria); fecha com clique fora ou Esc; ponto dourado some após a primeira abertura (`sinoVisto`); sino e histórico ocultos no PDF via `.sino-wrap`/`.historico-overlay` na lista `.oculto-no-pdf`.

## 7. src/data.js — Parser da Planilha

- `MAPA`: mapeia campos internos → nomes das colunas no Sheets:
  `romaneio→Romaneio, anexos→Anexos, hora→Hora, data→Data, motorista→Motorista, placa→Placa, regiao→Região, peso→Peso, valor→Valor, veiculo→Veiculo, capacidade→Capacidade, ocupacao→%Ocupação, entregas→Entrega, destino→Destino, acrescimo→Acrescimo%, frete→Frete, adiantamento→Adiantamento, caixas→Caixas, caixasSF→Caixas S.F.`
- Campos numéricos (`NUMERIC`): peso, valor, capacidade, entregas, acrescimo, frete, adiantamento, caixas, caixasSF, romaneio.
- `num(v)`: aceita formato BR ("1.234,56") e número cru; inválido/nulo → 0.
- `parseData(v)`: aceita Date nativo (cellDates) ou string `dd/mm/yyyy`.
- `hora`: célula numérica do Sheets é `HHMM` → convertida para `"HH:MM"`.
- Linhas sem `Romaneio` são descartadas. Lê sempre a **primeira aba**.
- `parseXlsx(buffer)` — caminho em uso: parse do XLSX baixado direto do link de export da planilha.
- `parsePlanilhaJson({cabecalhos, valores})` — LEGADO: mesmo mapeamento a partir do JSON do Apps Script (datas `dd/MM/yyyy`, hora numérica `HHMM`). Sem uso desde 2026-08-25; mantido para eventual rollback.

> ⚠️ Se renomearem colunas no Google Sheets, atualizar `MAPA` — é o contrato com a fonte de dados.

## 8. src/i18n.jsx — Internacionalização

- Contexto `I18nContext` + hook `useI18n()` retornando `{ lang, setLang, t, meses }`.
- `LINGUAS`: `pt`, `en`, `es` — bandeiras em `/bandeiras/{br,en,es}.png`.
- `DICIONARIO`: ~110 chaves por idioma, prefixadas por área (`comum.*`, `header.*`, `nav.*`, `kpi.*`, `grade.*`, `dist.*`, `dias.*`, `det.*`, `resumo.*`, `comparar.*`, `acum.*`, `dia.*`, `admin.*`, `met.*`, `login.*`, `export.*`, `meses.0..11`).
- `traduzir(lang, key, vars)`: fallback PT → chave crua; interpolação `{var}`.
- `MESES_POR_LINGUA`: array de 12 siglas de mês por idioma.

> **REGRA:** qualquer texto novo visível na UI DEVE ter entrada nos 3 idiomas. Nunca deixar texto hardcoded em JSX.

## 9. src/styles.css — Design System

- **Tema:** azul-marinho `#003E61` + dourado `#C09F44`; fundo geral `#f1f5f9`; texto `#1e293b`.
- **Fonte:** `'Segoe UI', system-ui, -apple-system, sans-serif`.
- **Layout:** `.app` max-width 1400px centralizado; cards brancos arredondados; grids CSS (`kpis`, `grade-layout`, `grid-charts`).
- **Componentes estilizados:** header escuro, abas com indicador deslizante (`.aba-indicador`), tabelas `.tabela` (hover, `.num` tabular-nums, tfoot destacado), KPIs, tela de login (fundo blur + overlay gradiente), modal de exportação, paginação, `seg-botoes` segmentados, `badge-admin`.
- **Responsivo:** breakpoints `@media (max-width: 1000px)` e `(max-width: 640px)`.
- **PDF:** classe `.oculto-no-pdf { display:none !important }` usada durante exportação.

## 10. Segurança

- ✅ **(2026-08-24) Autenticação server-side:** senhas hasheadas com bcrypt em env vars da Netlify (`SENHA_COMUM_HASH`, `SENHA_ADMIN_HASH`); validação só nas Functions; sessão = cookie `rep_sessao` HttpOnly + Secure + SameSite=Lax assinado com HMAC-SHA256 (`SESSION_SECRET`), TTL 60 min; rate limit 20 tentativas/10min por IP no login.
- ⚠️ **(2026-08-25) Dados públicos de novo:** por decisão do usuário (performance), o frontend voltou a ler a planilha diretamente pelo link de export XLSX — a planilha precisa ficar acessível publicamente via link ("qualquer pessoa com o link"). Quem tiver o link consegue baixar os dados sem logar; a senha protege apenas a interface do dashboard. As functions `dados`/`warm` e o Apps Script de cache foram desativados/removidos (`APPS_SCRIPT_URL`/`APPS_SCRIPT_TOKEN` seguem nas env vars, sem uso).
- ⚠️ As senhas antigas (`opergel` anterior à migração e a admin antiga) devem ser consideradas queimadas — a comum foi reutilizada pelo usuário, a admin foi trocada.
- Não commitar segredos novos; manter tudo em env vars (`.env` local espelha a Netlify).

## 11. Deploy (Netlify)

- Config em `netlify.toml`: build `npm run build`, publish `dist/`, redirect SPA `/* → /index.html` (status 200).
- Site ID (`.netlify/state.json`): `dfb61f4a-f511-4302-a95d-3e894179c7d8`.
- Deploy manual via CLI. **Fluxo usado em 2026-08-24** (contorna pasta de plugins corrompida): `npm run build` e depois `netlify deploy --prod --dir dist --functions netlify/functions`.
- As env vars foram configuradas via `netlify env:set` (espelhadas no `.env`).

## 12. Convenções de Código (seguir rigorosamente)

1. **JSX/JS puro**, ESM (`import/export`), sem TypeScript.
2. Um único arquivo grande (`App.jsx`) é o padrão histórico — novos componentes pequenos podem ir para o fim do próprio App.jsx; só criar arquivos novos se o usuário pedir ou se ficar muito extenso.
3. Estado via hooks locais (`useState/useMemo/useEffect/useRef/useLayoutEffect`); derivados sempre em `useMemo`.
4. Textos da UI SEMPRE via `t('chave')` com entradas em pt/en/es (seção 8).
5. **NUNCA usar travessões (—) em textos visíveis** (feed `ATUALIZACOES`, dicionário i18n, títulos, avisos): passam cara de texto gerado por IA e o usuário não quer. Escrever frases curtas separadas por ponto, vírgula ou dois pontos.
6. Cores SEMPRE das constantes do topo (`GOLD`, `NAVY`...), nunca hex solto no JSX.
7. Números formatados com os helpers `fmt/fmtMoney/fmtTon/fmtPct`.
8. Sem comentários no código, exceto quando essencial (padrão atual do projeto).
9. Validação mínima obrigatória após mudanças: `npm run build`.
10. **NUNCA regravar arquivos inteiros via `Get-Content`/`Set-Content` do PowerShell 5.1** — o `Get-Content` sem `-Encoding` lê UTF-8 como ANSI (Windows-1252) e corrompe acentos. Para manipular arquivos inteiros, usar `[System.IO.File]::ReadAllText/WriteAllText` com `System.Text.UTF8Encoding($false)` (sem BOM). Editações pontuais devem usar a ferramenta de edição.

## 13. Changelog

| Data | Alteração |
|---|---|
| 2026-08-21 | Criação desta documentação mestre (AGENTS.md) e do backlog (planner.md). Nenhuma alteração de código nesta data. |
| 2026-08-21 | Grade de veículos com colunas ordenáveis (padrão da tabela Detalhes); rosca da distribuição reduzida (`innerRadius 60→46`, `outerRadius 110→84`) para o rótulo não cortar sob o título; rótulo de média dos gráficos diários agora é badge retangular arredondado (`RotuloMedia`) com fundo colorido e texto branco. Build validado; **não publicado em produção**. |
| 2026-08-21 | Hotfix tela branca: `gradeLinhas` useMemo referenciava `gradeVeiculos` antes da declaração (TDZ → crash de runtime não pego pelo build). Bloco de ordenação da grade movido para depois do `useMemo` de `gradeVeiculos`. **Lição:** ordem de declaração de hooks/memos no App.jsx importa; validar também em `npm run dev`, não só `npm run build`. |
| 2026-08-21 | Badge de média (`RotuloMedia`) movido para abaixo da linha pontilhada (antes ficava acima), reduzindo sobreposição com os valores das barras. Build validado; **não publicado em produção**. |
| 2026-08-21 | Badge de média (`RotuloMedia`) fixado no topo direito do gráfico (dentro da margem superior), fora da área das barras, para não atrapalhar os rótulos de valor. Build validado; **não publicado em produção**. |
| 2026-08-21 | **Publicado em produção** (`netlify deploy --prod`): grade ordenável, rosca reduzida e badge de média no topo. Deploy ID `6a883f2c68d0cefe8b9b39f8` → https://report-opergel-app.netlify.app |
| 2026-08-21 | Botão de sino de novidades ao lado das bandeiras (painel dropdown trilíngue com feed `ATUALIZACOES`; fecha com clique fora/Esc; ponto dourado até primeira abertura; oculto no PDF). Em teste local; **não publicado em produção**. |
| 2026-08-21 | Ícones trocados para o set Solar Bold (SVG Repo, paths inline com `currentColor`): sino do painel de novidades, cadeados de mostrar/ocultar senha no login (fechado = oculta, aberto = visível) e ícone de documento/download no botão "Exportar PDF" (substituiu o SVG 512px antigo). Correção: os arquivos baixados vieram trocados — `lock-password.svg` tinha ícone de documento; rebaixado com o cadeado correto. SVGs originais em `public/icones/`. Em teste local; **não publicado em produção**. |
| 2026-08-21 | Hotfix acentos corrompidos (mojibake "botÃ£o") no App.jsx: causa foi regravação via PowerShell 5.1 (`Get-Content` ANSI → `Set-Content` UTF8). Revertido com transformação inversa CP1252→UTF-8 byte a byte. Regra adicionada às convenções (item 9). Build validado; **não publicado em produção**. |
| 2026-08-21 | `fmtTon` agora arredonda toneladas para no máximo 2 casas decimais (antes usava o padrão de 3 do `toLocaleString`). Vale para todos os lugares que exibem peso em t. Entrada adicionada ao feed `ATUALIZACOES`. Build validado; **não publicado em produção**. |
| 2026-08-21 | Toast de aviso ao logar: "Os pesos são exibidos em toneladas (t)" (trilíngue, chave `aviso.toneladas`); aparece por 5s após login (`avisoTon`), some sozinho e é oculto no PDF. Entrada no feed `ATUALIZACOES`. Build validado; **não publicado em produção**. |
| 2026-08-21 | Aviso de toneladas trocado de toast para modal centralizado com botão "Entendi/Got it/Entendido" (`aviso.ok`); fecha também com clique no fundo; sem auto-dismiss; oculto no PDF via `.aviso-overlay`. Build validado; **não publicado em produção**. |
| 2026-08-21 | Feed do sino reestruturado: agrupado por data (`{ data, itens: [...] }`), itens da mesma data separados por "•" — uma entrada por release. Build validado; **não publicado em produção**. |
| 2026-08-21 | Itens do sino agora renderizados como lista (`.sino-lista`), um por linha com marcador dourado, em vez de parágrafo único com "•". Build validado; **não publicado em produção**. |
| 2026-08-21 | Modal de aviso de toneladas ganhou coroa da logo (path do `logo.svg` inline, dourada) no topo e título "Importante!/Important!/¡Importante!" (`aviso.titulo`). Build validado; **não publicado em produção**. |
| 2026-08-21 | **Publicado em produção** (`netlify deploy --prod`): modal de aviso com coroa e título "Importante!", feed do sino como lista agrupada por data. Deploy ID `6a8859a6589c49f0ae25c1a6` → https://report-opergel-app.netlify.app |
| 2026-08-21 | **Publicado em produção** (`netlify deploy --prod`): sino de novidades com feed agrupado por data, ícones Solar Bold (sino, cadeados, documento PDF), modal de aviso de toneladas ao logar, `fmtTon` com 2 decimais. Deploy ID `6a8857965d490462e9965edd` → https://report-opergel-app.netlify.app |
| 2026-08-24 | Hotfix filtros resetando: fetch a cada 10s recriava `rows` e dois efeitos disparavam por identidade de objeto (`dataMax` novo → `setDataSel` sobrescrevia filtro; paginação voltava à página 1). Corrigido com varredura por assinatura (`assinaturaRows`) antes de aplicar `setRows` e inicialização única do `dataSel`. Build validado; **não publicado em produção**. |
| 2026-08-24 | Auditoria de segurança (5 categorias): senhas hardcoded no bundle + autorização 100% client-side (críticos); planilha Sheets pública; zips órfãos de functions. Itens registrados no planner.md. |
| 2026-08-24 | **Migração serverless completa e publicada** (`netlify deploy --prod --dir dist --functions netlify/functions`, deploy ID `6a8ca2043c699f728812039b`): functions `login` (bcrypt+rate limit), `logout`, `dados` (sessão obrigatória, gzip) e `warm` (@hourly) versionadas em `netlify/functions/`; cookie HMAC 60 min; senhas rotacionadas em env vars; Apps Script na planilha com cache gzip (TTL 6h) + probe de assinatura + reconstrução assíncrona por trigger; frontend sem segredos (bundle auditado: sem senha nem URL da planilha); polling trocado para sonda 15s + payload só quando muda; gate SHA-256 no texto. Smoke test completo em prod: login/logout/sessão/401/gzip OK. Node modules corrompidos contornados renomeando pastas (`*_corrompido`) — pendente chkdsk. |
| 2026-08-24 | Resiliência da primeira carga: timeout interno do `dados` 9,5s → 24s e `[functions]` timeout=26 no netlify.toml; com rows vazias, a UI permanece em spinner "Preparando os dados iniciais…" (`comum.preparando`) repetindo por até ~20 falhas antes de exibir o erro (contagem em `falhasRef`). Deploy `6a8ca6e8`. |
| 2026-08-24 | Nomes de veículos em UPPERCASE em toda a UI: `exibirVeiculo` agora retorna `.toUpperCase()`; pizza de distribuição passou a usar `exibirVeiculo` nos rótulos (antes usava a chave bruta); tabelas Admin/Detalhes trocaram `limparVeiculo` por `exibirVeiculo`. Deploy `6a8ca87e`. |
| 2026-08-24 | Sino paginado: dropdown mostra só os 3 blocos de data mais recentes; link "Ver histórico completo" abre modal com o feed inteiro em blocos de data (`.historico-overlay`/`.historico-modal`, fecha fora/Esc, oculto no PDF). Chaves i18n `sino.*`. |
| 2026-08-25 | **Reversão da fonte de dados para o link direto** (pedido do usuário — atualização via functions/Apps Script estava lenta): frontend volta a baixar o XLSX de export do Google Sheets a cada 10s (`POLL_MS` 15s→10s), com gate SHA-256 dos bytes + diff de `assinaturaRows` antes do `setRows` (sem reset de filtros); `shaHex` agora aceita ArrayBuffer; removidas as functions `dados.js`/`warm.js`; Apps Script e `parsePlanilhaJson` ficam como legado para rollback. Planilha precisa estar pública via link (seção 10). Smoke test: link responde XLSX válido (~5 MB) e parser retorna 50.222 rows sem datas inválidas. Build validado; entrada no feed `ATUALIZACOES`. |
| 2026-08-25 | **Publicado em produção** (`netlify deploy --prod --dir dist --functions netlify/functions`, deploy ID `6a8d7af91078576375738c41`) → https://report-opergel-app.netlify.app — bundle de prod confirmado com o link direto e sem referência a `functions/dados`; só `login/logout/_sessao` empacotadas. |
| 2026-08-25 | Botão "Abrir planilha" no Painel Admin (só admins veem): abre o Google Sheets em modo edição em nova aba (`URL_PLANILHA` = link `/edit`); i18n trilíngue (`admin.abrirPlanilha`); CSS `.admin-acoes`/`.btn-planilha` (borda navy, hover navy com texto branco); classe `.oculto-no-pdf`. **Publicado em produção** (deploy ID `6a8d7d161943a9bbe309d761`), bundle confirmado com link/chave/CSS. |
| 2026-08-25 | Item do botão "Abrir planilha" removido do feed `ATUALIZACOES` a pedido do usuário (não anunciar a novidade a todos); o botão em si permanece. **Publicado em produção** (deploy ID `6a8d7e0b5dcd8dc51e11248e`). |
| 2026-08-25 | Hotfix botão "Abrir planilha" invisível: `.oculto-no-pdf` estava fixa no className do botão (classe é aplicada dinamicamente só durante export de PDF → `display:none` permanente). Removida do JSX e `.btn-planilha` adicionada ao seletor dinâmico da exportação (App.jsx, querySelectorAll do PDF). **Lição:** nunca usar `.oculto-no-pdf` estático no JSX. **Publicado em produção** (deploy ID `6a8d7f1bcb6d4389e9e8d1a3`), bundle confirmado. |
| 2026-08-25 | Hotfix "CAMINHO34": visões agrupadas (grade de veículos, pizza, filtro/header do Resumo) exibiam a chave interna sem acentos (`caminho34`) passada ao `exibirVeiculo`, que não reconstrói o nome original. Corrigido com entrada canônica `caminho34: 'Caminhão 3/4'` em `CANONICO_VEICULOS` (varredura da base confirmou ser o único nome afetado; dados da planilha estão corretos: 2.013× "SP - Caminhão 3/4", 2× "SC - Caminhão 3/4"). **Publicado em produção** (deploy ID `6a8d8e4a8a3329d897126f1d`), bundle confirmado. **Lição:** qualquer novo veículo com acento/símbolo precisa de entrada em `CANONICO_VEICULOS`. |
| 2026-08-26 | Gráficos diários da aba Geral não cortam mais no dia selecionado: `diasDados` agora varre `rows` para achar o último dia com dados do mês/ano da referência e usa esse dia como corte (antes usava o dia de `dataSel`, escondendo os dias posteriores). Com data selecionada, a barra do dia escolhido fica em 100% e as demais ganham opacidade leve (`destaque`/`fillOpacity` 0,95 no `GraficoDias`; antes 0,22 e 0,45, suavizado a pedido do usuário). Entrada no feed `ATUALIZACOES`. **Publicado em produção** (deploy ID `6a8ed2a335f8ead67d480e44`, bundle confirmado; ajustes de opacidade nos deploys `6a8ecf2ac8e571c6523202e3` e `6a8ed3a35b795b00c21df274`). |
| 2026-08-26 | Hotfix `npm run dev`: o file watcher do Vite crashava (`UNKNOWN lstat`) ao varrer a pasta corrompida `node_modules_corrompido/`. Adicionado `server.watch.ignored` no `vite.config.js` para as pastas `node_modules_corrompido/` e `.netlify/plugins_corrompido/` (workaround até o `chkdsk /f D:` permitir excluí-las). Build validado; **não publicado em produção** (config de dev não afeta o bundle). |
| 2026-08-26 | Texto do feed `ATUALIZACOES` de 26/08 reescrito sem travessões nos 3 idiomas e regra tornada permanente: convenção item 5 da seção 12 proíbe travessões em qualquer texto visível (o usuário não quer cara de texto de IA). Build validado; pendente publicar junto com a próxima release. |
| 2026-08-26 | Barras dos gráficos diários da aba Geral clicáveis: nova prop `aoClicar` no `GraficoDias` (cursor pointer, `onClick` do Bar) + handler `aoClicarDiaGeral` que monta a ISO do dia a partir de `diasDados.ref` e aplica em `dataSel`; clicar de novo na mesma barra restaura a data máxima. Animação do Bar desativada (`isAnimationActive={false}`) porque a reanimação a cada clique atrasava os rótulos e causava salto visual. Entrada no feed `ATUALIZACOES`. Build validado; **em teste local, não publicado**. |
| 2026-08-26 | Rosca de distribuição clicável: novo estado `veiculoSel` + memo `filtradosVeiculo` (filtra `filtrados` por veículo); KPIs e grade de veículos usam `filtradosVeiculo`; agregação extraída para helper `agregarGrade` (grade da tabela = filtradosVeiculo, rosca = `gradeBase`/filtrados, então continua mostrando todos os veículos). Clique na fatia alterna o filtro (clicar na mesma limpa); fatias não selecionadas com `fillOpacity` 0,88; título mostra "(Filtrado: VEÍCULO)" (`dist.filtrado`, trilíngue); botão "Limpar" do header também reseta `veiculoSel`. Entrada no feed `ATUALIZACOES`. Build validado; **em teste local, não publicado**. |
| 2026-08-26 | Filtro de veículo da rosca agora também vale para os gráficos diários de barras da aba Geral: `diasDados` usa fonte filtrada só por veículo (`fonteDias`, sem o filtro de `dataSel` — o corte do gráfico continua sendo o mês completo; média por dia só considera dias com valor > 0). Compara Anos: linha do ano corrente destacada em tom dourado leve (`anoDestaque` no `GradeAno`, CSS `.ano-atual`). Grade de veículos NÃO filtra pelo selecionado: volta a mostrar todos (`gradeVeiculos` = `agregarGrade(filtrados)`); linha do veículo selecionado destacada (`.linha-ativa`, mesmo dourado do `.ano-atual`) e linhas zeradas com opacidade 0,85 (`.linha-zero`). Entrada no feed `ATUALIZACOES`. Build validado; **em teste local, não publicado**. |
| 2026-08-26 | **Reversão da rosca clicável a pedido do usuário**: removidos o filtro por fatia, o estado `veiculoSel`/`filtradosVeiculo`, o destaque na grade (`.linha-ativa`/`.linha-zero`) e as chaves `dist.filtrado`; rosca, grade e KPIs voltaram ao comportamento anterior. Mantidos: clique nas barras diárias para filtrar o dia e destaque dourado do ano atual no Compara Anos. Itens da rosca retirados do feed `ATUALIZACOES` (nunca chegou a produção). Build validado; **não publicado em produção**. |
| 2026-08-26 | Botão "Print E-mail" no Painel Admin: captura a aba Visão Geral (KPIs, grade de veículos, rosca, gráficos de barra) sem filtros/botões/navegação/sino/bandeiras, salva como `report_dd-mm-aaaa.png`. Função `printEmail` usa html2canvas com seletor `.email-capture` (wrapper da aba Geral) e `onclone` ocultando `.sino-wrap`, `.abas-bandeiras`, `.abas-linha`, `.sair`, `.exportar`, `.reportar`, `.admin-acoes`, `.detalhes .det-filtro`, `.detalhes .paginacao`, `.seg-botoes`. CSS `.btn-email-print` (borda dourada, hover dourado). i18n `admin.printEmail`. Build validado; **em teste local, não publicado**. |

---
*Manutenção deste arquivo é obrigatória: documento desatualizado = código errado amanhã.*
