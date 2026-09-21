# Mia — Landing page

Site estático: HTML, CSS e um arquivo de JavaScript. **Sem build, sem dependências, sem `npm install`.**

```
index.html      página completa
styles.css      estilos (mobile por padrão, desktop a partir de 1024px)
script.js       barra fixa, carrossel das conversas e evento view_content
assets/         logo (versão branca usada na página) e favicon
```

## Rodar local

Abrir o `index.html` no navegador já funciona. Para servir em HTTP:

```bash
python3 -m http.server 8000
```

## Deploy

Publicado no **GitHub Pages** deste repositório (branch `main`, raiz). Todo push na `main` republica sozinho, sem build.

- Domínio: `lp1.miaapp.com.br`, definido pelo arquivo `CNAME` na raiz (não remover).
- DNS: registro **CNAME** `lp1.miaapp.com.br` → `mia-bitboundaire.github.io` na zona Route 53 de `miaapp.com.br` (conta AWS de produção).
- HTTPS emitido e renovado pelo próprio GitHub Pages.
- `.nojekyll` desliga o processamento Jekyll: os arquivos são servidos como estão.

Para trocar de host, qualquer serviço de site estático serve o repositório direto, com build vazio e diretório de saída `.`.

## Rastreio já instalado

- **OpenAI Ads (ChatGPT Ads)** — pixel `Hp6vxcY38XyiUvp6rbK3mq`, SDK `oaiq` carregado no topo do `<head>`, como a documentação exige.
  - `oaiq("measure", "page_viewed")` é **explícito**: o SDK não dispara page view sozinho.
  - A conversão (`registration_completed`) acontece no domínio do app, não aqui. Para a OpenAI atribuir a conversão, o **mesmo pixel** precisa estar instalado em `web.miaapp.com.br`.
- **Microsoft Clarity** — projeto `ykcqxc0ffo`.
- **RudderStack JS SDK v3** — write key `34ndFYFhQmaiPjSdHmsHucwPRtV`, dataplane `bitboundaipthl.dataplane.rudderstack.com`.
  - A chamada `rudderanalytics.page()` é **explícita** no HTML: o SDK v3 removeu a chamada implícita das versões anteriores, e sem ela nenhum page view é enviado. Não remover.
  - `useBeacon: true` garante a entrega do evento mesmo quando o clique leva o usuário para outro domínio.
- **`view_content`** — disparado em `script.js` no clique em qualquer link que saia do domínio, com as propriedades `button`, `button_location` e `destination_url`. A regra é por domínio: link novo para fora passa a ser rastreado sozinho.
- **GTM e Meta Pixel** — há comentários `TODO RASTREIO` no `<head>` e no início do `<body>` marcando onde colar os snippets.

O evento de cadastro/agendamento **não** é disparado aqui; ele acontece no domínio do app.

## Convenções

- Todo CTA tem `id`, `data-cta` e `data-cta-location` — dá para instrumentar por seletor sem tocar no HTML.
- Breakpoint único em **1024px**. As classes `.only-mobile` e `.only-desktop` alternam os poucos textos que mudam entre as versões.
- Os mockups de celular e as conversas de WhatsApp são desenhados em CSS, não são imagens.

## Pendências

- [ ] Confirmar a URL de login do botão "Entrar" (está como `https://web.miaapp.com.br/auth/sign-in`, deduzida a partir da URL de cadastro — há um comentário `CONFIRMAR` no HTML).
- [ ] URL da central de ajuda (hoje o link "Ajuda" aponta para o WhatsApp do atendimento).
- [ ] `og:image` (o `og:url` já aponta para `https://lp1.miaapp.com.br/`).
- [ ] Confirmar que o pixel já instalado em `web.miaapp.com.br` emite `registration_completed` ao fim do cadastro (carregar o pixel não basta: o evento é chamada explícita) e que o `oppref` da landing chega até lá.
- [ ] Seção "Como fica no WhatsApp": as conversas são **ilustrativas** e estão sinalizadas como tal. Com prints reais e autorização por escrito, trocar por imagens (tarjando telefone e foto) e retomar o título "Quem já usa".
