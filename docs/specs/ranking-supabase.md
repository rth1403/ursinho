# Ranking compartilhado (Supabase)

## Contexto
O jogo roda em vários computadores na feira e é publicado no GitHub Pages (só arquivos
estáticos). Hoje o ranking fica no `localStorage` de cada navegador, então cada estação
vê só os próprios jogadores. Queremos um ranking único para todas as estações.

GitHub Pages não executa código no servidor; por isso o banco fica no Supabase (Postgres),
acessado direto do navegador pela API REST com a chave pública (publishable/anon) e
protegido por RLS.

## Requisitos funcionais
- [x] RF1: ao terminar as 3 fases numa partida iniciada na fase 1, o resultado (apelido,
      ursinho, tempo, corações) é enviado ao Supabase.
- [x] RF2: o ranking do lobby (top 5) e o painel do admin leem do Supabase, com o melhor
      tempo de cada jogador.
- [x] RF3: se o Supabase estiver fora do ar ou sem internet, o jogo continua; o resultado
      fica numa fila local e é reenviado depois.
- [x] RF4: sem Supabase configurado (url/key vazios), o jogo funciona como antes, só com
      `localStorage`.

## Requisitos não-funcionais
- Segurança: a chave no `index.html` é a pública (anon/publishable), não a `service_role`.
  O RLS permite ao anônimo apenas `select` e `insert` em `ranking`. Não há update/delete.
  Os CHECKs no banco limitam o tamanho do nome, o ursinho e o tempo plausível.
  Risco aceito: quem souber usar a API pode inserir um tempo falso. Para uma feira isso é
  aceitável, e o admin pode apagar linhas pelo painel do Supabase.
- Segurança: o nome do jogador é escapado antes de ir para o HTML do ranking, porque
  agora ele vem de outros computadores.
- Performance: uma consulta ao abrir o lobby e uma ao abrir o painel admin. Usa índice em `time_ms`.
- LGPD: o dado tratado é o apelido de crianças (dado pessoal de criança, Art. 14).
  - Minimização: vão ao servidor só o apelido, o ursinho, o tempo e os corações. Senha,
    estrelas e progresso continuam só no navegador.
  - Orientação na tela de cadastro: usar apelido, não nome completo.
  - Base legal e retenção: consentimento do responsável no local da feira. Os dados são
    apagados ao fim do evento (`delete from ranking;`, ver `supabase/schema.sql`).

## Breakdown modular
- Fase 1: `supabase/schema.sql` (tabela, RLS e view `ranking_best`).
- Fase 2: cliente REST no `index.html` (`SUPABASE` config, `postResult`, `fetchRanking`,
  fila `ursinho_pending`).
- Fase 3: ranking do lobby e painel admin passam a usar o `fetchRanking`, com fallback local.

## Critérios de aceitação
- [x] CA1: dado o Supabase configurado, terminar as 3 fases envia um POST para `/rest/v1/ranking`.
- [x] CA2: dado o Supabase configurado, o lobby mostra os jogadores vindos do GET de `ranking_best`.
- [x] CA3: dada uma falha de rede no POST, o resultado vai para `ursinho_pending` e é
      reenviado no próximo carregamento.
- [x] CA4: dado o Supabase não configurado, nenhuma requisição é feita e o ranking local funciona.
- [x] CA5: um nome com `<img onerror>` aparece como texto, sem executar código.
- [x] CA6: o painel admin lista os jogadores vindos do Supabase.

## Decisões de arquitetura
- Supabase em vez de Cloudflare D1: o usuário aceitou Postgres, e o Supabase dispensa
  escrever e publicar um backend próprio.
- `fetch` direto na API REST em vez do `supabase-js`: evita uma dependência de CDN para
  duas chamadas simples.
- Uma linha por partida concluída, e a view `ranking_best` agrega o melhor tempo por
  jogador. Assim não é preciso dar `update` ao anônimo.
