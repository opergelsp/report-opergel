# Planner — Backlog de Funcionalidades · Report Expedição

> **Como usar este arquivo:** é o backlog oficial do projeto.
> - Funcionalidade desejada → adicionar em "Pendentes" com data.
> - Funcionalidade concluída → mover para "Concluídas" com data de entrega.
> - Antes de qualquer sessão, ler também o `AGENTS.md` (documentação mestre).

---

## Pendentes

- [ ] **Visualização gráfica do veículo** — silhueta/caminhão em SVG com estados visuais (carregando, em rota, descarregando, inativo). *(registrada antes da documentação; origem: usuário)*
- [ ] **Excluir pastas corrompidas do disco** — `node_modules_corrompido/` e `.netlify/plugins_corrompido/` não apagam por via normal (NTFS corrompido); rodar `chkdsk /f D:` e excluir manualmente. *(2026-08-24)*

## Concluídas

- [x] **Migrar autenticação para serverless** — ✅ 2026-08-24 em produção (deploy `6a8ca2043c699f728812039b`). Functions `login/logout/dados/warm` versionadas em `netlify/functions/`; bcrypt vs env vars; cookie HMAC HttpOnly 60 min; rate limit no login; senhas rotacionadas (`opergeladmin` nova admin); bundle sem segredos.
- [x] **Privar a fonte de dados (Google Sheets)** — ✅ 2026-08-24 em produção. ⚠️ Revertida em 2026-08-25 por decisão do usuário (performance): dados voltaram a ser lidos pelo link público. Ver item abaixo.
- [x] **Reverter atualização de dados para o link direto** — ✅ 2026-08-25 em produção (deploy `6a8d7af91078576375738c41`). Frontend baixa o XLSX direto do link de export do Google Sheets a cada 10s (gate SHA-256 + diff de assinatura antes de renderizar); functions `dados`/`warm` removidas; Apps Script mantido como legado. A planilha voltou a precisar de acesso público via link. Usuário avaliou opções de proteção do link (proxy enxuto, service account) e decidiu manter link direto por performance.
- [x] **Botão "Abrir planilha" no Painel Admin** — ✅ 2026-08-25 em produção (deploy `6a8d7d161943a9bbe309d761`; hotfix visibilidade `6a8d7f1bcb6d4389e9e8d1a3`). Abre o Sheets em modo edição em nova aba; trilíngue; oculto no PDF.
- [x] **Correção "CAMINHO34" na grade/pizza/filtro** — ✅ 2026-08-25 em produção (deploy `6a8d8e4a8a3329d897126f1d`). Entrada canônica `caminho34: 'Caminhão 3/4'`; base de dados estava correta, o problema era só de exibição da chave agrupada.
- [x] **Limpar functions legadas órfãs** — ✅ 2026-08-24. Fonte das functions agora versionada no repo; zips em `.netlify/functions/` viraram artefatos de build regenerados a cada deploy (sem mais código órfão).
- [x] **Correção: filtros resetando pela atualização automática** — ✅ 2026-08-24. Fetch só aplica `setRows` quando a assinatura das rows muda de verdade; `dataSel` inicializa uma única vez.
- [x] **Rosca de distribuição com filtro por fatia** — ~~implementada em 2026-08-26~~ **REVERTIDA antes de publicar** (pedido do usuário): rosca volta a ser só visual, sem filtro. Não usar como referência.
- [x] **Filtro de veículo da rosca nos gráficos de barras + ano atual destacado no Compara Anos** — parte da rosca revertida em 2026-08-26; mantido apenas o destaque dourado do ano atual no Compara Anos.
- [x] **Gráficos da aba Geral com mês completo + destaque e clique na barra** — ✅ 2026-08-26 (em teste local). Gráfico não corta mais no dia selecionado; barra do dia destacada; clique na barra filtra o dia (toggle ao clicar de novo).
- [x] **Botão "Print E-mail" no Painel Admin** — ✅ 2026-08-26 (em teste local). Captura a aba Visão Geral como PNG (`report_dd-mm-aaaa.png`) sem filtros/botões/navegação/sino/bandeiras. Função `printEmail` usa html2canvas; botão dourado no admin; i18n trilíngue.

---

## Ideias soltas (não priorizadas)

*(espaço para anotações rápidas que ainda não viraram item formal)*
