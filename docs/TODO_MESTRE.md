# TODO Mestre — Ursinho Aventura

## Fazendo

## Esperando usuário
- [x] Criar o projeto no Supabase e informar a URL e a publishable key (no `.env`)
- [ ] Rodar `supabase/schema.sql` no SQL Editor do Supabase
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
