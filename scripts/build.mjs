// Uso: npm run video -- <episodio> [--sem-render] [--quadro N]
// 1) voz por cena  2) sincronia das legendas  3) gameplay por cena  4) render final
import {execFileSync, spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
if (!slug) {
  console.error('Informe o episódio. Disponíveis:\n  ' + readdirSync('episodes').join('\n  '));
  process.exit(1);
}
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);

const epDir = path.join('episodes', slug);
const episode = JSON.parse(readFileSync(path.join(epDir, 'episode.json'), 'utf8'));
const channel = JSON.parse(readFileSync('channel.json', 'utf8'));
const fps = channel.fps;
const pubRel = `ep/${slug}`;
const pubDir = path.join('public', pubRel);
mkdirSync(path.join(pubDir, 'voice'), {recursive: true});

execFileSync('node', ['scripts/sfx.mjs'], {stdio: 'inherit'});

const probe = (file) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* ── 1. voz ─────────────────────────────────────────────────────────── */
const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.ogg', '.flac'];
let placeholderVoice = false;

function voiceFor(id, text) {
  const real = AUDIO_EXT.map((e) => path.join(epDir, 'voice', id + e)).find(existsSync);
  const out = path.join(pubDir, 'voice', `${id}.wav`);
  if (real) {
    // normaliza volume e remove silêncio das pontas da gravação do Voice Studio
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', real, '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-15:TP=-1.5',
      '-ar', '48000', out]);
    return out;
  }
  placeholderVoice = true;
  const tmp = out.replace('.wav', '.raw.wav');
  const r = spawnSync('espeak-ng', ['-v', 'pt-br', '-s', '172', '-p', '38', '-w', tmp, text]);
  if (r.status !== 0) {
    console.error(`\nSem áudio para a cena "${id}". Coloque ${epDir}/voice/${id}.mp3 (Voice Studio) ou instale espeak-ng para a voz provisória.`);
    process.exit(1);
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '48000', out]);
  return out;
}

/* ── 2. tempo de cada palavra ───────────────────────────────────────── */
function silences(file, total) {
  const r = spawnSync('ffmpeg', ['-i', file, '-af', 'silencedetect=noise=-34dB:d=0.13', '-f', 'null', '-'], {encoding: 'utf8'});
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return starts
    .map((s, i) => ({s: Math.max(0, s), e: ends[i] ?? total}))
    .filter((x) => x.s > 0.08 && x.e < total - 0.08); // só pausas internas
}

function timeWords(text, file, total) {
  const tokens = text.split(/\s+/).filter(Boolean).map((raw) => {
    const hl = /\*/.test(raw);
    return {t: raw.replace(/\*/g, ''), hl};
  });
  const weight = (w) => Math.max(2, norm(w.t).length) + 1.5;
  // frases = trechos entre pontuações; cada pausa detectada no áudio ancora uma frase
  const phrases = [[]];
  for (const w of tokens) {
    phrases[phrases.length - 1].push(w);
    if (/[.,!?;:…]$/.test(w.t)) phrases.push([]);
  }
  if (!phrases[phrases.length - 1].length) phrases.pop();

  const sil = silences(file, total);
  const spans = [];
  if (sil.length === phrases.length - 1) {
    let start = 0;
    phrases.forEach((_, i) => {
      const end = sil[i] ? sil[i].s : total;
      spans.push([start, end]);
      start = sil[i] ? sil[i].e : end;
    });
  } else {
    // sem correspondência exata: distribui pelo tamanho das palavras, com respiro na pontuação
    const pauseOf = (p) => (/[.!?…]$/.test(p[p.length - 1].t) ? 5 : 2.5);
    const w = phrases.map((p) => p.reduce((n, x) => n + weight(x), 0));
    const sum = w.reduce((a, b) => a + b, 0) + phrases.slice(0, -1).reduce((n, p) => n + pauseOf(p), 0);
    let t = 0;
    phrases.forEach((p, i) => {
      const d = (w[i] / sum) * total;
      spans.push([t, t + d]);
      t += d + (i < phrases.length - 1 ? (pauseOf(p) / sum) * total : 0);
    });
  }
  const words = [];
  phrases.forEach((p, i) => {
    const [a, b] = spans[i];
    const sum = p.reduce((n, x) => n + weight(x), 0);
    let t = a;
    for (const w of p) {
      const d = (weight(w) / sum) * (b - a);
      words.push({t: w.t, start: +t.toFixed(3), end: +(t + d).toFixed(3), ...(w.hl ? {hl: true} : {})});
      t += d;
    }
  });
  return words;
}

/* ── 3. gameplay ────────────────────────────────────────────────────── */
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.mkv'];
const clips = (existsSync('public/gameplay') ? readdirSync('public/gameplay') : [])
  .filter((f) => VIDEO_EXT.includes(path.extname(f).toLowerCase()))
  .sort()
  .map((f) => ({src: `gameplay/${f}`, dur: probe(path.join('public/gameplay', f)), cursor: 0}));

function bgFor(index, seconds, wanted) {
  if (!clips.length) return null;
  const clip = (wanted && clips.find((c) => c.src.endsWith(wanted))) || clips[index % clips.length];
  if (clip.dur < seconds + 1) return {src: clip.src, startFrom: 0, loopFrames: Math.floor(clip.dur * fps) - 1};
  if (clip.cursor + seconds + 1 > clip.dur) clip.cursor = 0;
  const bg = {src: clip.src, startFrom: +clip.cursor.toFixed(2), loopFrames: null};
  clip.cursor += seconds + 0.5;
  return bg;
}

/* ── monta a linha do tempo ─────────────────────────────────────────── */
const TRANSITIONS = ['zoom', 'slide-left', 'circle', 'slide-up', 'diagonal'];
const LEAD = 4; // frames antes da voz
const TAIL = 9; // frames de respiro depois da voz
let cursor = 0;
const narrationSheet = [];

const scenes = episode.scenes.map((sc, i) => {
  const id = sc.id ?? `c${String(i + 1).padStart(2, '0')}`;
  const spoken = sc.narration.replace(/\*/g, '');
  narrationSheet.push(`[${id}]  →  salvar como ${epDir}/voice/${id}.mp3\n${spoken}\n`);
  const file = voiceFor(id, spoken);
  const total = probe(file);
  const words = timeWords(sc.narration, file, total);
  const duration = LEAD + Math.ceil(total * fps) + TAIL;

  // cues: cada item de lista/linha do tempo aparece quando a narração fala a palavra-chave
  const props = structuredClone(sc.props ?? {});
  if (sc.type === 'cta' && !props.handle) props.handle = channel.handle;
  const cued = props.items ?? props.points;
  if (Array.isArray(cued)) {
    cued.forEach((it, k) => {
      const hit = it.cue && words.find((w) => norm(w.t).startsWith(norm(it.cue)));
      const fallback = (0.12 + (0.7 * k) / cued.length) * total;
      it._at = Math.max(8 + k * 6, Math.round(LEAD + (hit ? hit.start - 0.1 : fallback) * fps));
    });
  }

  const scene = {
    id,
    type: sc.type,
    props,
    from: cursor,
    duration,
    audio: `${pubRel}/voice/${id}.wav`,
    audioLead: LEAD,
    words,
    bg: bgFor(i, duration / fps, sc.gameplay),
    transition: sc.transition ?? TRANSITIONS[i % TRANSITIONS.length],
  };
  cursor += duration;
  return scene;
});

const music = episode.music && existsSync(path.join('public/music', episode.music)) ? `music/${episode.music}` : null;
const timeline = {
  fps,
  width: channel.width,
  height: channel.height,
  durationInFrames: cursor,
  channel: {name: channel.name, handle: channel.handle},
  music,
  placeholderVoice,
  scenes,
};
const propsFile = path.join(pubDir, 'timeline.json');
writeFileSync(propsFile, JSON.stringify({timeline}, null, 1));
writeFileSync(path.join(epDir, 'narracao.txt'), narrationSheet.join('\n'));

console.log(`\n${episode.title}`);
console.log(`  ${scenes.length} cenas · ${(cursor / fps).toFixed(1)}s`);
console.log(`  voz: ${placeholderVoice ? 'PROVISÓRIA (espeak) — grave as falas de narracao.txt no Voice Studio' : 'arquivos do Voice Studio'}`);
console.log(`  gameplay: ${clips.length ? clips.map((c) => c.src).join(', ') : 'nenhum clipe em public/gameplay — usando fundo provisório'}`);

if (flag('sem-render')) process.exit(0);

/* ── 4. render ──────────────────────────────────────────────────────── */
mkdirSync('out', {recursive: true});
const browser =
  process.env.REMOTION_BROWSER ??
  ['/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find(existsSync);
const common = [`--props=${propsFile}`, ...(browser ? [`--browser-executable=${browser}`] : [])];
const frame = opt('quadro');
const cmd = frame
  ? ['remotion', 'still', 'src/index.ts', 'Video', `out/${slug}-${frame}.png`, `--frame=${frame}`, ...common]
  : ['remotion', 'render', 'src/index.ts', 'Video', `out/${slug}.mp4`, '--codec=h264', '--crf=18', '--audio-bitrate=192k', ...common];
const r = spawnSync('npx', cmd, {stdio: 'inherit'});
process.exit(r.status ?? 1);
