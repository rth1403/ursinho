# TODO Mestre — Ursinho Aventura

## Fazendo
- [x] fix: controles de toque (← ↑ →) em todo aparelho de toque, inclusive celular deitado (CA1: celular em paisagem 844×390 mostra os 3 botões; CA2: computador sem toque não mostra; CA3: dedo que escorrega para fora do botão não deixa o ursinho andando sozinho; CA4: segurar → e tocar ↑ ao mesmo tempo funciona)
- [ ] bug: Rebeca loga mas não vê o admin — com Supabase ligado o login dela depende do usuário `ADMIN_EMAIL` existir no Supabase Auth com a mesma senha (itens em "Esperando usuário")
- [x] feat: QR code na tela inicial apontando para https://rth1403.github.io/ursinho/ (CA: `#account` exibe um QR em SVG inline, sem dependência externa, com o link visível ao lado)

## Esperando usuário
- [x] Criar o projeto no Supabase e informar a URL e a publishable key (no `.env`)
- [x] Rodar `supabase/schema.sql` no SQL Editor do Supabase
- [ ] Criar o usuário da Rebeca no Supabase Auth, cadastrá-lo na tabela `admins` e informar o e-mail (vai em `ADMIN_EMAIL`)
- [ ] Trocar a senha do banco (`SENHA_SUPABASE`): parte dela apareceu no log da sessão em 2026-11-12

## Backlog

## Feito
- [x] feat: admin com dificuldade e lista de jogadores com corações; lobby só com "Começar aventura" → [spec](specs/admin-config.md)
- [x] chore: remove a cena "cair na floresta" e as fases 4–15
- [x] feat: ranking compartilhado entre computadores via Supabase → [spec](specs/ranking-supabase.md)
- [x] fix: painel admin mostrava corações como "/5" fixo
- [x] chore: visualização local da página (`.claude/launch.json`)
- [x] feat: jogo reduzido a 3 fases
- [x] feat: login Rebeca / rebeca123 habilita o painel admin (sem PIN)
- [x] feat: só entra no ranking quem termina as 3 fases começando da fase 1
