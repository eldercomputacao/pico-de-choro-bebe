# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Site estático de uma única página (sem build, sem framework) hospedado em `picodechorobebe.com.br`. Calcula e exibe graficamente o **Período PURPLE** — pico de choro em bebês de 0 a 4 meses — com suporte a prematuros via idade corrigida.

## Desenvolvimento

Sem build step. Abra `index.html` diretamente no navegador ou sirva com qualquer servidor estático:

```bash
python3 -m http.server 8080
# ou
npx serve .
```

## Arquitetura

Três arquivos de código, sem dependências de build:

| Arquivo | Papel |
|---|---|
| `index.html` | Estrutura semântica, SEO (meta tags, Schema.org, FAQ schema), Chart.js via CDN |
| `style.css` | Design system baseado em CSS custom properties (`--sky`, `--teal`, etc.), layout responsivo com CSS Grid e `clamp()` |
| `script.js` | Toda a lógica: cálculo de IC, geração do gráfico Chart.js, milestones e barra de progresso |

### Lógica central (`script.js`)

- **`intensity(week, premWeeks)`** — curva de intensidade de choro em 4 segmentos: pré-IC, escalada (IC 0–6), pico (IC 6–8), declínio (IC 8–16)
- **`calcular()`** — função principal acionada pelo botão; lê os inputs, deriva todas as datas-chave e renderiza milestones, barra de progresso, gráfico e tags de fases
- O gráfico usa um plugin inline `annotations` (sem biblioteca extra) que desenha diretamente no canvas com `afterDraw`
- `chartInstance` é global para permitir `destroy()` antes de re-renderizar
- Datas são manipuladas com `Date` nativo; timezone é fixado com `T12:00:00` para evitar off-by-one no parse de `YYYY-MM-DD`

### Datas-chave calculadas

Todas derivadas a partir de `birth` e `premWeeks = 40 - gest`:

- `dpp = birth + premWeeks` semanas (DPP teórica, só exibida para prematuros)
- `peakStart = birth + premWeeks + 6` semanas (IC 6 sem)
- `peakEnd = birth + premWeeks + 8` semanas (IC 8 sem)
- `purpleEnd = birth + premWeeks + 16` semanas (IC 16 sem)

### Design system

Paleta e tokens de espaçamento definidos em `:root` no topo de `style.css`. Fontes externas: Nunito (títulos) e Lato (corpo), via Google Fonts. Biblioteca de gráfico: Chart.js 4.4.1 via cdnjs.
