# GTA 6 — fábrica de vídeos verticais

Gera vídeos 1080×1920 de notícias e curiosidades do GTA 6: gameplay ao fundo, narração,
legendas palavra a palavra, motion design por cena e transições entre os cortes.
Você escreve um roteiro em JSON; o resto é automático.

## Como fazer um vídeo

```bash
npm install
npm run video -- 001-semana-de-lancamento     # gera out/001-semana-de-lancamento.mp4
```

1. **Roteiro** — copie `episodes/001-semana-de-lancamento` para uma pasta nova e edite `episode.json`.
2. **Voz** — rode `npm run video -- <episodio> --sem-render`. Isso cria `narracao.txt` na pasta do
   episódio, com a fala de cada cena. Gere cada fala no Voice Studio e salve em
   `episodes/<episodio>/voice/c01.mp3`, `c02.mp3`… (mp3, wav ou m4a). Cena sem arquivo usa uma voz
   robótica provisória e o vídeo sai com o selo "VOZ PROVISÓRIA".
3. **Gameplay** — coloque os clipes (mp4/mov) em `public/gameplay/gta6/` e `public/gameplay/gta5/`,
   com nomes que descrevam a cena (`cidade-noite.mp4`, `online-assalto.mp4`). Em cada cena do roteiro,
   `"gameplay": "gta6 cidade"` escolhe um clipe cujo caminho contenha essas palavras; sem
   correspondência, usa qualquer clipe do mesmo jogo. Trechos não se repetem enquanto houver material.
4. **Render** — `npm run video -- <episodio>`.

Extras: `--quadro 300` renderiza só um quadro (PNG) para conferir o visual; `npm run studio`
abre o editor do Remotion com pré-visualização. Trilha: `public/music/<arquivo>` + `"music"` no roteiro.
Nome do canal e @: `channel.json`.

## Roteiro

Cada cena tem `type`, `narration` e `props`. Palavras entre `*asteriscos*` ganham destaque
(na legenda e nos títulos). A duração da cena é a duração da fala.

| type | para quê | props |
|---|---|---|
| `hook` | abertura de impacto | `kicker`, `lines[]` |
| `headline` | manchete | `tag`, `title`, `source`, `image` |
| `stat` | número gigante com contagem | `tag`, `label`, `prefix`, `value`, `decimals`, `suffix`, `sub` |
| `list` | itens que entram no ritmo da fala | `title`, `items[] {text, cue}` |
| `timeline` | linha do tempo | `title`, `points[] {date, label, status, cue}` |
| `compare` | A vs B | `title`, `left`, `right` `{label, value, note}` |
| `quote` | citação | `text`, `author` |
| `image` | print/arte em destaque (arquivo em `public/images`) | `src`, `caption`, `tag` |
| `cta` | chamada final | `title`, `sub` |

- `tag`: `CONFIRMADO`, `OFICIAL`, `RUMOR`, `VAZAMENTO`, `URGENTE`, `CURIOSIDADE` (cada um com sua cor).
- `cue`: começo de uma palavra da narração; o item aparece quando ela é falada.
- `transition` (opcional): `zoom`, `slide-left`, `slide-up`, `circle`, `diagonal`.

## Onde mexer

- `src/scenes/index.tsx` — os modelos de cena
- `src/Captions.tsx` — legendas
- `src/Background.tsx` — gameplay e transições
- `src/theme.ts` — cores, fontes, margens seguras
- `scripts/build.mjs` — voz, sincronia e render
