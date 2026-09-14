# 🧸 Ursinho

Aplicação web estática, publicada com GitHub Pages.

🔗 **Acesse:** https://rth1403.github.io/ursinho/

## Sobre

_Descreva aqui o que o Ursinho faz._

## Rodando localmente

Não há build nem dependências — é HTML, CSS e JavaScript puros. Basta abrir o arquivo no navegador:

```bash
git clone https://github.com/rth1403/ursinho.git
cd ursinho
xdg-open index.html   # ou dê dois cliques no arquivo
```

Se preferir um servidor local (útil para testar `fetch`, módulos ES etc.):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicação (GitHub Pages)

O site é servido diretamente da branch `main`, a partir da raiz do repositório.

Para publicar uma alteração:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

O GitHub Pages atualiza o site em cerca de um minuto após o push.

### Configuração inicial (feita uma única vez pelo dono do repositório)

1. **Settings → General → Danger Zone → Change visibility → Public**
   (em contas gratuitas, o Pages só funciona em repositórios públicos)
2. **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save**

## Estrutura

```
ursinho/
├── index.html   # página principal
└── README.md
```

## Limitações

O GitHub Pages hospeda apenas arquivos estáticos: não há servidor, banco de dados ou código executado no backend. Para persistir dados, use `localStorage` no navegador ou um serviço externo (Firebase, Supabase etc.).
