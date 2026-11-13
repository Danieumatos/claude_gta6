import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp} from './anim';
import {BODY, C} from './theme';
import type {SceneData, Word} from './types';

type AbsWord = Word & {s: number; e: number};
type Chunk = {words: AbsWord[]; s: number; e: number};

const buildChunks = (scenes: SceneData[], fps: number): Chunk[] => {
  const chunks: Chunk[] = [];
  for (const sc of scenes) {
    let cur: AbsWord[] = [];
    const flush = () => {
      if (cur.length) chunks.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
      cur = [];
    };
    for (const w of sc.words) {
      const aw = {...w, s: sc.from + sc.audioLead + w.start * fps, e: sc.from + sc.audioLead + w.end * fps};
      const chars = cur.reduce((n, x) => n + x.t.length, 0);
      if (cur.length >= 3 || (cur.length && chars + w.t.length > 15)) flush();
      cur.push(aw);
      if (/[.!?…:;,]$/.test(w.t)) flush();
    }
    flush();
  }
  // cada bloco fica na tela até o próximo começar (ou um respiro curto)
  chunks.forEach((c, i) => {
    const next = chunks[i + 1];
    c.e = next ? Math.min(next.s, c.e + fps * 0.5) : c.e + fps * 0.4;
  });
  return chunks;
};

export const Captions: React.FC<{scenes: SceneData[]}> = ({scenes}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chunks = useMemo(() => buildChunks(scenes, fps), [scenes, fps]);
  const chunk = chunks.find((c) => frame >= c.s && frame < c.e);
  if (!chunk) return null;

  const enter = spring({frame: frame - chunk.s, fps, config: {damping: 12, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: 1235, height: 240, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 44px',
          maxWidth: 980,
          transform: `scale(${0.82 + 0.18 * enter}) rotate(${(1 - enter) * -2}deg)`,
          opacity: interpolate(frame, [chunk.s, chunk.s + 2], [0, 1], clamp),
        }}
      >
        {chunk.words.map((w, i) => {
          const active = frame >= w.s && frame < w.e + 1;
          const done = frame >= w.e + 1;
          const bump = spring({frame: frame - w.s, fps, config: {damping: 10, stiffness: 300, mass: 0.4}});
          const color = active ? (w.hl ? C.pink : C.yellow) : w.hl ? C.pink : C.white;
          return (
            <span
              key={i}
              style={{
                fontFamily: BODY,
                fontWeight: 900,
                fontSize: 86,
                lineHeight: 1.08,
                textTransform: 'uppercase',
                letterSpacing: -1,
                color,
                opacity: done || active ? 1 : 0.92,
                transform: `scale(${active ? 1 + 0.12 * bump : 1}) translateY(${active ? -6 * bump : 0}px)`,
                WebkitTextStroke: '14px #0B0614',
                paintOrder: 'stroke fill',
                textShadow: active ? `0 0 34px ${w.hl ? C.pink : C.yellow}88, 0 8px 0 #0B0614` : '0 8px 0 #0B0614',
              }}
            >
              {w.t.replace(/[.,;:]$/, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
