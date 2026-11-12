# Painel admin: dificuldade e jogadores

## Contexto
Na feira, a Rebeca (admin) quer deixar o jogo mais fácil ou mais difícil para todas as
estações de uma vez, e ver quantos corações cada jogador conquistou. O jogo tem 3 fases,
e toda partida começa na fase 1. Depende de [ranking-supabase](ranking-supabase.md).

Decisões do usuário (2026-11-12):
- As configurações valem para **todos os computadores**: ficam no Supabase, e só um login
  real (Supabase Auth) pode alterá-las.
- Dificuldade em **3 níveis**: Fácil / Normal / Difícil.
- **Um ranking por dificuldade**: só se comparam tempos feitos na mesma dificuldade.
- **Só 3 fases.** Liberar fases extras foi pedido e depois descartado.
- **A única admin é a Rebeca**: um único `ADMIN_EMAIL`, e uma única linha em `admins`.
- O lobby tem só o botão "Começar aventura". Não há seletor de fases, e toda partida
  começa na fase 1.

## Requisitos funcionais
- [x] RF1: o lobby tem só o botão "Começar aventura", que sempre inicia na fase 1, com
      tempo e corações zerados.
- [x] RF2: com Supabase configurado, entrar como "Rebeca" autentica no Supabase Auth com
      `ADMIN_EMAIL` e a senha digitada. Se der certo, ela vira admin. A senha não fica no código.
- [x] RF3: o admin escolhe a dificuldade (Fácil / Normal / Difícil) e salva. Todas as
      estações aplicam ao carregar.
- [x] RF4: dificuldade. Fácil: pulo mais alto, plataformas móveis mais lentas e com menor
      amplitude. Difícil: pulo mais baixo, plataformas mais rápidas e com maior amplitude.
- [x] RF5: o ranking (lobby e admin) mostra só os resultados da dificuldade atual.
- [x] RF6: a aba "Jogadores" do admin lista cada jogador com os corações conquistados
      (soma do melhor resultado em cada fase) e o número de fases jogadas.
- [x] RF7: offline ou sem Supabase, o jogo usa a última dificuldade salva no navegador
      (ou Normal). Sem Supabase, o admin continua com o login local (Rebeca / rebeca123)
      e a dificuldade vale só para aquele navegador.

## Requisitos não-funcionais
- Segurança: a tabela `settings` tem leitura pública e escrita só para usuários da tabela
  `admins` (RLS com `auth.uid()`). Mesmo que alguém crie uma conta pela API pública, não
  consegue alterar nada. O token do admin fica no `sessionStorage` e expira em 1h.
- Segurança: os nomes vindos do banco continuam escapados (`esc`) em todas as telas.
- LGPD: `phase_results` guarda só o apelido, o ursinho, a fase e os corações (minimização).
  Retenção: apagar ao fim da feira, como o `ranking`.
- Performance: uma leitura de `settings` ao carregar e uma consulta por aba aberta no admin.

## Breakdown modular
- Fase 1: SQL (`settings`, `admins`, `phase_results`, coluna `difficulty` em `ranking`, views).
- Fase 2: lobby só com "Começar aventura" e constantes de dificuldade no loop.
- Fase 3: login admin via Supabase Auth.
- Fase 4: abas do painel admin: Ranking / Jogadores / Dificuldade.

## Critérios de aceitação
- [x] CA1: o lobby não tem seletor de fases. "Começar aventura" inicia na fase 1, mesmo
      depois de uma partida anterior.
- [x] CA2: com `settings` = {difficulty:"facil"}, o pulo é mais forte e as plataformas
      móveis mais lentas que no Normal. Com "dificil", o contrário.
- [x] CA3: Rebeca + senha certa chama `/auth/v1/token` e mostra o botão admin. Com a senha
      errada (400), não mostra.
- [x] CA4: salvar a dificuldade no admin faz um PATCH em `/rest/v1/settings` com
      `Authorization: Bearer <token>`.
- [x] CA5: a consulta do ranking filtra por `difficulty=eq.<nível>`, e o POST do resultado
      leva o mesmo `difficulty`.
- [x] CA6: terminar uma fase faz um POST em `phase_results`, e a aba Jogadores lista
      `player_hearts`.
- [x] CA7: no modo local, a aba Jogadores mostra os corações dos jogadores deste navegador,
      e a dificuldade escolhida vale para este navegador.

## Decisões de arquitetura
- O login da Rebeca usa o mesmo formulário do jogo. O nome "Rebeca" é mapeado para
  `ADMIN_EMAIL`, então ela não precisa digitar e-mail.
- A autorização vem da tabela `admins`, não de "qualquer autenticado", porque o signup
  público do Supabase pode estar ligado.
- `phase_results` é só de inserção, e a view calcula o melhor por fase. Assim o anônimo
  nunca recebe `update`.
- A dificuldade entra em cada linha do ranking. Mudar a dificuldade não apaga nada: o
  ranking daquele nível volta quando o nível voltar.
- Com o seletor de fases removido, a trava `fromStart` deixa de ser necessária: toda
  partida começa na fase 1.
- Difícil usa pulo -9,5 (≈167 px de altura) em vez de algo menor, para que as plataformas
  existentes continuem alcançáveis.
