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
// Ordem: gravação própria em voice/ → VoiceStudio (local, aberto) → Kokoro → voz robótica provisória.
const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.ogg', '.flac'];
const VOICE = channel.voice ?? {};
const VS_URL = process.env.VOICESTUDIO_URL ?? VOICE.url ?? 'http://127.0.0.1:3900';
let placeholderVoice = false;
const voiceUsed = new Set();

const vsUp = await fetch(`${VS_URL}/health`, {signal: AbortSignal.timeout(3000)}).then((r) => r.ok, () => false);
if (VOICE.provider === 'voicestudio' && !vsUp) console.warn(`  VoiceStudio não respondeu em ${VS_URL}; usando a voz reserva.`);

async function voiceStudioTts(text, out) {
  const form = new FormData();
  form.set('engine', VOICE.engine ?? 'voxcpm2');
  form.set('text', text);
  form.set('language', 'Portuguese (Brazil)');
  if (VOICE.seed != null) form.set('seed', String(VOICE.seed));
  if (VOICE.reference) {
    // clona sempre a mesma referência: o timbre não muda de uma cena para outra
    form.set('ref_audio', new Blob([readFileSync(VOICE.reference)], {type: 'audio/wav'}), path.basename(VOICE.reference));
    if (VOICE.referenceText) form.set('ref_text', VOICE.referenceText);
  } else if (VOICE.design) {
    form.set('instruct', VOICE.design);
  }
  const r = await fetch(`${VS_URL}/generate`, {method: 'POST', body: form});
  if (!r.ok) throw new Error(`VoiceStudio ${r.status}: ${(await r.text()).slice(0, 200)}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

async function voiceFor(id, text) {
  const real = AUDIO_EXT.map((e) => path.join(epDir, 'voice', id + e)).find(existsSync);
  const out = path.join(pubDir, 'voice', `${id}.wav`);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,';
  if (real) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', real, '-af', `${trim}loudnorm=I=-15:TP=-1.5`, '-ar', '48000', out]);
    voiceUsed.add('gravação própria');
    return out;
  }
  const tmp = out.replace('.wav', '.raw.wav');
  let ok = false;
  if (VOICE.provider === 'voicestudio' && vsUp) {
    try {
      await voiceStudioTts(text, tmp);
      ok = true;
      voiceUsed.add(`VoiceStudio ${VOICE.engine ?? 'voxcpm2'}`);
    } catch (e) {
      console.warn(`  ${id}: ${e.message}; usando a voz reserva.`);
    }
  }
  if (!ok && existsSync('models/kokoro-v1.0.onnx')) {
    const k = VOICE.kokoro ?? {};
    ok = spawnSync('python3', ['scripts/tts.py', k.name ?? 'pm_alex', String(k.speed ?? 1.1), tmp, text]).status === 0;
    if (ok) voiceUsed.add('Kokoro');
  }
  if (!ok) {
    placeholderVoice = true;
    ok = spawnSync('espeak-ng', ['-v', 'pt-br', '-s', '172', '-p', '38', '-w', tmp, text]).status === 0;
    if (ok) voiceUsed.add('espeak (provisória)');
  }
  if (!ok) {
    console.error(`\nSem áudio para a cena "${id}". Suba o VoiceStudio, rode scripts/setup-voz.sh ou coloque ${epDir}/voice/${id}.mp3.`);
    process.exit(1);
  }
  const tempo = VOICE.tempo && VOICE.tempo !== 1 ? `atempo=${VOICE.tempo},` : '';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', `${trim}${tempo}loudnorm=I=-16:TP=-1.5`, '-ar', '48000', out]);
  return out;
}

/* ── 2. tempo de cada palavra ───────────────────────────────────────── */
// Com o VoiceStudio no ar, o Whisper dele diz quando cada palavra é falada; sem ele, estima pelas pausas.
async function asrWords(file) {
  if (!vsUp) return null;
  try {
    const form = new FormData();
    form.set('file', new Blob([readFileSync(file)], {type: 'audio/wav'}), 'fala.wav');
    form.set('language', 'pt');
    form.set('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    const r = await fetch(`${VS_URL}/v1/audio/transcriptions`, {method: 'POST', body: form});
    if (!r.ok) return null;
    const words = (await r.json()).words ?? [];
    return words.length ? words.map((w) => ({n: norm(w.word), start: w.start, end: w.end})) : null;
  } catch {
    return null;
  }
}

const same = (a, b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** Casa as palavras do roteiro com as reconhecidas (maior subsequência comum) e interpola as que sobram. */
function alignWords(tokens, heard, total) {
  const A = tokens.map((t) => norm(t.t));
  const n = A.length, m = heard.length;
  const L = Array.from({length: n + 1}, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = same(A[i], heard[j].n) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hit = new Array(n).fill(null);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (same(A[i], heard[j].n)) hit[i++] = heard[j++];
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  if (hit.filter(Boolean).length < n * 0.5) return null; // reconhecimento ruim demais: melhor estimar
  const weight = (t) => Math.max(2, norm(t.t).length) + 1.5;
  const out = [];
  for (let i = 0; i < n; ) {
    if (hit[i]) {
      out.push({start: hit[i].start, end: hit[i].end});
      i++;
      continue;
    }
    let k = i;
    while (k < n && !hit[k]) k++;
    const a = i ? out[i - 1].end : 0;
    const b = k < n ? hit[k].start : total;
    const run = tokens.slice(i, k);
    const sum = run.reduce((s, t) => s + weight(t), 0);
    let t = a;
    for (const tok of run) {
      const d = (weight(tok) / sum) * Math.max(0.05, b - a);
      out.push({start: t, end: t + d});
      t += d;
    }
    i = k;
  }
  return out;
}

function silences(file, total) {
  const r = spawnSync('ffmpeg', ['-i', file, '-af', 'silencedetect=noise=-34dB:d=0.13', '-f', 'null', '-'], {encoding: 'utf8'});
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return starts
    .map((s, i) => ({s: Math.max(0, s), e: ends[i] ?? total}))
    .filter((x) => x.s > 0.08 && x.e < total - 0.08); // só pausas internas
}

let syncedBy = new Set();
async function timeWords(text, file, total) {
  const tokens = text.split(/\s+/).filter(Boolean).map((raw) => ({t: raw.replace(/\*/g, ''), hl: /\*/.test(raw)}));
  const heard = await asrWords(file);
  const aligned = heard && alignWords(tokens, heard, total);
  if (aligned) {
    syncedBy.add('Whisper');
    return tokens.map((w, i) => ({t: w.t, start: +aligned[i].start.toFixed(3), end: +aligned[i].end.toFixed(3), ...(w.hl ? {hl: true} : {})}));
  }
  syncedBy.add('pausas do áudio');
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
const walk = (dir) =>
  !existsSync(dir) ? [] : readdirSync(dir, {withFileTypes: true}).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const clips = walk('public/gameplay')
  .filter((f) => VIDEO_EXT.includes(path.extname(f).toLowerCase()))
  .sort()
  .map((f) => ({src: path.relative('public', f).split(path.sep).join('/'), dur: probe(f), cursor: 0, used: 0}));

// "gameplay" da cena = palavras que precisam aparecer no caminho do clipe (pasta ou nome),
// ex.: "gta6 cidade" casa com public/gameplay/gta6/cidade-noite.mp4. Entre os que casam, usa o menos usado.
function bgFor(index, seconds, wanted) {
  if (!clips.length) return null;
  const keys = (wanted ?? '').split(/\s+/).filter(Boolean).map(norm);
  let pool = clips.filter((c) => keys.every((k) => norm(c.src).includes(k)));
  if (!pool.length && keys.length) pool = clips.filter((c) => norm(c.src).includes(keys[0]));
  if (!pool.length) pool = clips;
  const clip = [...pool].sort((a, b) => a.used - b.used)[0];
  clip.used++;
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

const scenes = [];
for (const [i, sc] of episode.scenes.entries()) {
  const id = sc.id ?? `c${String(i + 1).padStart(2, '0')}`;
  const spoken = sc.narration.replace(/\*/g, '');
  narrationSheet.push(`[${id}]  →  para trocar por gravação própria: ${epDir}/voice/${id}.mp3\n${spoken}\n`);
  process.stdout.write(`  voz ${id}…\r`);
  const file = await voiceFor(id, spoken);
  const total = probe(file);
  const words = await timeWords(sc.narration, file, total);
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
  scenes.push(scene);
}

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
console.log(`  voz: ${[...voiceUsed].join(' + ')}${placeholderVoice ? ' — suba o VoiceStudio ou rode scripts/setup-voz.sh' : ''}`);
console.log(`  legendas sincronizadas por: ${[...syncedBy].join(' + ')}`);
scenes.forEach((s) => console.log(`    ${s.id} ${s.type.padEnd(9)} ← ${s.bg ? s.bg.src + ' @' + s.bg.startFrom + 's' : 'fundo provisório'}`));
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
