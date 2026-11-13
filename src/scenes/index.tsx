import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Pop, Rich, clamp, panel, useEase, useExit, usePop} from '../anim';
import {BODY, C, DISPLAY, GRAD, SAFE} from '../theme';

type P<T = any> = {props: T; duration: number};

const TAGS: Record<string, string> = {
  CONFIRMADO: C.green,
  OFICIAL: C.green,
  RUMOR: C.orange,
  VAZAMENTO: C.red,
  URGENTE: C.red,
  CURIOSIDADE: C.cyan,
};

/** Área útil dos cards: entre a barra do topo e as legendas. */
const Stage: React.FC<{duration: number; children: React.ReactNode; justify?: string}> = ({duration, children, justify = 'center'}) => {
  const exit = useExit(duration);
  return (
    <AbsoluteFill
      style={{
        top: SAFE.top + 30,
        height: 980,
        padding: `0 ${SAFE.side}px`,
        justifyContent: justify,
        alignItems: 'center',
        opacity: exit,
        transform: `scale(${0.9 + 0.1 * exit}) translateY(${(1 - exit) * -60}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Tag: React.FC<{label: string; delay?: number}> = ({label, delay = 0}) => {
  const color = TAGS[label.toUpperCase()] ?? C.pink;
  return (
    <Pop delay={delay} from="left" dist={200}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: BODY,
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: 3,
          color: C.ink,
          background: color,
          padding: '10px 24px',
          borderRadius: 12,
          transform: 'skewX(-8deg)',
          boxShadow: `0 0 40px ${color}99`,
        }}
      >
        <span style={{width: 14, height: 14, borderRadius: 7, background: C.ink}} />
        {label.toUpperCase()}
      </div>
    </Pop>
  );
};

const title = (size: number): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  lineHeight: 1.02,
  color: C.white,
  textTransform: 'uppercase',
  letterSpacing: 1,
  textShadow: '0 10px 40px rgba(0,0,0,0.75), 0 4px 0 rgba(0,0,0,0.55)',
});

/* ───────── hook: abertura de impacto ───────── */
const Hook: React.FC<P<{kicker?: string; lines: string[]}>> = ({props, duration}) => {
  const frame = useCurrentFrame();
  const shake = Math.max(0, 1 - frame / 10) * 14;
  return (
    <Stage duration={duration}>
      <div style={{transform: `translate(${Math.sin(frame * 2.4) * shake}px, ${Math.cos(frame * 3.1) * shake}px)`, textAlign: 'center'}}>
        {props.kicker ? (
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 34}}>
            <Tag label={props.kicker} />
          </div>
        ) : null}
        {props.lines.map((l, i) => {
          const p = usePopAt(3 + i * 5);
          return (
            <div key={i} style={{overflow: 'hidden', padding: '4px 0'}}>
              <div style={{...title(i === props.lines.length - 1 ? 190 : 150), transform: `translateY(${(1 - p) * 110}%) scale(${1.25 - 0.25 * p})`}}>
                <Rich text={l} />
              </div>
            </div>
          );
        })}
        <Underline delay={10 + props.lines.length * 5} />
      </div>
    </Stage>
  );
};

// hook simples para usar dentro de .map (ordem estável por render)
const usePopAt = (delay: number) => usePop(delay, 12, 190);

const Underline: React.FC<{delay: number; width?: number}> = ({delay, width = 640}) => {
  const p = useEase(delay, 12);
  return <div style={{height: 14, width: width * p, background: GRAD, borderRadius: 8, margin: '26px auto 0', boxShadow: `0 0 40px ${C.pink}`}} />;
};

/* ───────── headline: manchete com selo e fonte ───────── */
const Headline: React.FC<P<{tag?: string; title: string; source?: string; image?: string}>> = ({props, duration}) => {
  const bar = useEase(4, 16);
  return (
    <Stage duration={duration}>
      <div style={{width: '100%'}}>
        {props.tag ? <Tag label={props.tag} /> : null}
        <Pop delay={4} dist={90} style={{marginTop: 26}}>
          <div style={{...panel, padding: '44px 46px 40px', position: 'relative', overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: GRAD, transform: `scaleY(${bar})`, transformOrigin: 'top'}} />
            {props.image ? (
              <Img src={staticFile(props.image)} style={{width: '100%', height: 420, objectFit: 'cover', borderRadius: 22, marginBottom: 30}} />
            ) : null}
            <div style={title(104)}>
              <Rich text={props.title} />
            </div>
            {props.source ? (
              <Pop delay={14} dist={30}>
                <div style={{marginTop: 26, fontFamily: BODY, fontWeight: 700, fontSize: 30, color: 'rgba(255,255,255,0.7)'}}>
                  Fonte: <span style={{color: C.cyan}}>{props.source}</span>
                </div>
              </Pop>
            ) : null}
          </div>
        </Pop>
      </div>
    </Stage>
  );
};

/* ───────── stat: número gigante com contagem ───────── */
const Stat: React.FC<P<{label?: string; prefix?: string; value: number; decimals?: number; suffix?: string; sub?: string; tag?: string}>> = ({
  props,
  duration,
}) => {
  const frame = useCurrentFrame();
  const count = useEase(6, 26);
  const pop = usePop(4);
  const decimals = props.decimals ?? 0;
  const shown = (props.value * count).toFixed(decimals).replace('.', ',');
  const ring = interpolate(frame, [30, 55], [0, 1], clamp);
  return (
    <Stage duration={duration}>
      <div style={{textAlign: 'center'}}>
        {props.tag ? (
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 20}}>
            <Tag label={props.tag} />
          </div>
        ) : null}
        {props.label ? (
          <Pop delay={0}>
            <div style={{...title(72), color: 'rgba(255,255,255,0.9)'}}>
              <Rich text={props.label} />
            </div>
          </Pop>
        ) : null}
        <div style={{position: 'relative', display: 'inline-block', transform: `scale(${0.5 + 0.5 * pop})`, margin: '6px 0'}}>
          <div
            style={{
              position: 'absolute',
              inset: -30,
              borderRadius: 60,
              border: `6px solid ${C.pink}`,
              opacity: (1 - ring) * 0.8,
              transform: `scale(${1 + ring * 0.25})`,
            }}
          />
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: shown.length + (props.prefix?.length ?? 0) + (props.suffix?.length ?? 0) > 7 ? 230 : 320,
              lineHeight: 1.05,
              background: GRAD,
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.7))',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {props.prefix ? <span style={{fontSize: '0.5em', marginRight: 14}}>{props.prefix}</span> : null}
            {shown}
            {props.suffix ? <span style={{fontSize: '0.45em', marginLeft: 14}}>{props.suffix}</span> : null}
          </div>
        </div>
        {props.sub ? (
          <Pop delay={24}>
            <div style={{...panel, display: 'inline-block', padding: '18px 34px', fontFamily: BODY, fontWeight: 800, fontSize: 40, color: C.white}}>
              <Rich text={props.sub} />
            </div>
          </Pop>
        ) : null}
      </div>
    </Stage>
  );
};

/* ───────── list: itens revelados no ritmo da narração ───────── */
const List: React.FC<P<{title: string; items: {text: string; _at: number; icon?: string}[]}>> = ({props, duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <Stage duration={duration} justify="flex-start">
      <div style={{width: '100%', paddingTop: 40}}>
        <Pop>
          <div style={title(96)}>
            <Rich text={props.title} />
          </div>
        </Pop>
        <Underline delay={6} width={300} />
        <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 22}}>
          {props.items.map((it, i) => {
            const d = it._at;
            const o = interpolate(frame, [d, d + 4], [0, 1], clamp);
            const x = interpolate(frame, [d, d + 10], [-140, 0], clamp);
            const fresh = interpolate(frame, [d, d + fps * 0.9], [1, 0], clamp);
            return (
              <div
                key={i}
                style={{
                  ...panel,
                  borderRadius: 26,
                  borderColor: `rgba(255,46,147,${0.14 + fresh * 0.8})`,
                  padding: '24px 30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 26,
                  opacity: o,
                  transform: `translateX(${x}px) scale(${1 + fresh * 0.03})`,
                }}
              >
                <div
                  style={{
                    flex: '0 0 84px',
                    height: 84,
                    borderRadius: 20,
                    background: GRAD,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: DISPLAY,
                    fontSize: 54,
                    color: C.white,
                  }}
                >
                  {it.icon ?? i + 1}
                </div>
                <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 46, lineHeight: 1.15, color: C.white}}>
                  <Rich text={it.text} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/* ───────── compare: A contra B ───────── */
type Side = {label: string; value: string; note?: string};
const Compare: React.FC<P<{title?: string; left: Side; right: Side}>> = ({props, duration}) => {
  const vs = usePop(16, 9, 220);
  const box = (s: Side, color: string): React.ReactNode => (
    <div style={{...panel, flex: 1, padding: '34px 20px', textAlign: 'center', borderColor: color, boxShadow: `0 0 50px ${color}55, 0 30px 80px rgba(0,0,0,0.55)`}}>
      <div style={{fontFamily: BODY, fontWeight: 900, fontSize: 34, letterSpacing: 2, color}}>{s.label.toUpperCase()}</div>
      <div style={{...title(120), marginTop: 12}}>{s.value}</div>
      {s.note ? <div style={{fontFamily: BODY, fontWeight: 700, fontSize: 30, color: 'rgba(255,255,255,0.75)', marginTop: 10}}>{s.note}</div> : null}
    </div>
  );
  return (
    <Stage duration={duration}>
      <div style={{width: '100%'}}>
        {props.title ? (
          <Pop>
            <div style={{...title(92), textAlign: 'center', marginBottom: 40}}>
              <Rich text={props.title} />
            </div>
          </Pop>
        ) : null}
        <div style={{display: 'flex', gap: 28, alignItems: 'stretch', position: 'relative'}}>
          <Pop delay={6} from="left" dist={400} style={{flex: 1, display: 'flex'}}>
            {box(props.left, C.cyan)}
          </Pop>
          <Pop delay={10} from="right" dist={400} style={{flex: 1, display: 'flex'}}>
            {box(props.right, C.pink)}
          </Pop>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 120,
              height: 120,
              margin: '-60px 0 0 -60px',
              borderRadius: 60,
              background: C.yellow,
              color: C.ink,
              fontFamily: DISPLAY,
              fontSize: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${vs}) rotate(${(1 - vs) * -90}deg)`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }}
          >
            VS
          </div>
        </div>
      </div>
    </Stage>
  );
};

/* ───────── timeline: linha do tempo ───────── */
const TimelineScene: React.FC<P<{title: string; points: {date: string; label: string; status?: 'ok' | 'cancelado' | 'agora'; _at: number}[]}>> = ({
  props,
  duration,
}) => {
  const frame = useCurrentFrame();
  const last = props.points[props.points.length - 1]._at;
  const line = interpolate(frame, [props.points[0]._at, last + 8], [0, 1], clamp);
  return (
    <Stage duration={duration} justify="flex-start">
      <div style={{width: '100%', paddingTop: 40}}>
        <Pop>
          <div style={title(96)}>
            <Rich text={props.title} />
          </div>
        </Pop>
        <div style={{position: 'relative', marginTop: 50, paddingLeft: 90}}>
          <div style={{position: 'absolute', left: 30, top: 20, bottom: 20, width: 8, borderRadius: 4, background: 'rgba(255,255,255,0.18)'}} />
          <div style={{position: 'absolute', left: 30, top: 20, bottom: 20, width: 8, borderRadius: 4, background: GRAD, transform: `scaleY(${line})`, transformOrigin: 'top'}} />
          {props.points.map((pt, i) => {
            const d = pt._at;
            const o = interpolate(frame, [d, d + 5], [0, 1], clamp);
            const x = interpolate(frame, [d, d + 10], [80, 0], clamp);
            const color = pt.status === 'cancelado' ? C.red : pt.status === 'agora' ? C.green : C.cyan;
            return (
              <div key={i} style={{position: 'relative', marginBottom: 30, opacity: o, transform: `translateX(${x}px)`}}>
                <div
                  style={{
                    position: 'absolute',
                    left: -78,
                    top: 34,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: color,
                    border: `6px solid ${C.ink}`,
                    boxShadow: `0 0 30px ${color}`,
                  }}
                />
                <div style={{...panel, borderRadius: 26, padding: '22px 30px'}}>
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 66,
                      color,
                      textDecoration: pt.status === 'cancelado' ? 'line-through' : 'none',
                      textDecorationColor: C.white,
                      textDecorationThickness: 6,
                    }}
                  >
                    {pt.date}
                  </div>
                  <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 38, color: C.white}}>{pt.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/* ───────── quote: citação ───────── */
const Quote: React.FC<P<{text: string; author: string}>> = ({props, duration}) => (
  <Stage duration={duration}>
    <Pop style={{width: '100%'}}>
      <div style={{...panel, padding: '60px 50px 46px', position: 'relative'}}>
        <div style={{position: 'absolute', top: -70, left: 36, fontFamily: DISPLAY, fontSize: 260, lineHeight: 1, background: GRAD, WebkitBackgroundClip: 'text', color: 'transparent'}}>
          “
        </div>
        <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 60, lineHeight: 1.18, color: C.white, marginTop: 50}}>
          <Rich text={props.text} />
        </div>
        <div style={{marginTop: 30, fontFamily: BODY, fontWeight: 900, fontSize: 34, color: C.cyan, letterSpacing: 2}}>— {props.author.toUpperCase()}</div>
      </div>
    </Pop>
  </Stage>
);

/* ───────── image: print ou arte em destaque ───────── */
const ImageScene: React.FC<P<{src: string; caption?: string; tag?: string}>> = ({props, duration}) => {
  const frame = useCurrentFrame();
  const p = usePop(2, 14, 150);
  return (
    <Stage duration={duration}>
      <div style={{width: '100%', transform: `scale(${0.7 + 0.3 * p}) rotate(${(1 - p) * -6 - 1.5}deg)`}}>
        {props.tag ? (
          <div style={{marginBottom: 20}}>
            <Tag label={props.tag} />
          </div>
        ) : null}
        <div style={{...panel, padding: 16, overflow: 'hidden'}}>
          <div style={{borderRadius: 24, overflow: 'hidden', height: 640}}>
            <Img src={staticFile(props.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.05 + frame * 0.0012})`}} />
          </div>
          {props.caption ? (
            <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 40, color: C.white, padding: '22px 18px 12px'}}>
              <Rich text={props.caption} />
            </div>
          ) : null}
        </div>
      </div>
    </Stage>
  );
};

/* ───────── cta: chamada final ───────── */
const Cta: React.FC<P<{title: string; sub?: string; handle?: string}>> = ({props, duration}) => {
  const frame = useCurrentFrame();
  const beat = 1 + 0.04 * Math.sin(frame / 4);
  return (
    <Stage duration={duration}>
      <div style={{textAlign: 'center'}}>
        <Pop from="scale">
          <div style={title(150)}>
            <Rich text={props.title} />
          </div>
        </Pop>
        {props.sub ? (
          <Pop delay={8}>
            <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 46, color: C.white, marginTop: 20, textShadow: '0 6px 24px rgba(0,0,0,0.8)'}}>
              <Rich text={props.sub} />
            </div>
          </Pop>
        ) : null}
        <Pop delay={14} from="scale">
          <div
            style={{
              display: 'inline-block',
              marginTop: 44,
              fontFamily: DISPLAY,
              fontSize: 70,
              color: C.white,
              background: GRAD,
              padding: '22px 60px 16px',
              borderRadius: 60,
              transform: `scale(${beat})`,
              boxShadow: `0 0 70px ${C.pink}`,
            }}
          >
            SEGUIR {props.handle ?? ''}
          </div>
        </Pop>
      </div>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC<P>> = {
  hook: Hook,
  headline: Headline,
  stat: Stat,
  list: List,
  compare: Compare,
  timeline: TimelineScene,
  quote: Quote,
  image: ImageScene,
  cta: Cta,
};
