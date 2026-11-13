import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {BgLayer, Scrim, Streak} from './Background';
import {Captions} from './Captions';
import {Chrome} from './Chrome';
import {SCENES} from './scenes';
import {C, TRANSITION_FRAMES} from './theme';
import type {Timeline} from './types';

export const Video: React.FC<{timeline: Timeline}> = ({timeline}) => {
  const half = Math.floor(TRANSITION_FRAMES / 2);
  const {scenes} = timeline;
  return (
    <AbsoluteFill style={{background: C.ink}}>
      {/* 1. gameplay: uma camada por cena, com transição por cima da anterior */}
      {scenes.map((s, i) => {
        const from = i === 0 ? 0 : s.from - half;
        const total = s.from + s.duration - from + TRANSITION_FRAMES;
        return (
          <Sequence key={s.id} from={from} durationInFrames={total} name={`bg ${s.id}`}>
            <BgLayer scene={s} index={i} total={total} />
          </Sequence>
        );
      })}
      <Scrim />
      {scenes.slice(1).map((s) => (
        <Sequence key={s.id} from={s.from - half} durationInFrames={TRANSITION_FRAMES} name={`corte ${s.id}`}>
          <Streak />
          <Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
        </Sequence>
      ))}

      {/* 2. motion design de cada cena */}
      {scenes.map((s) => {
        const Scene = SCENES[s.type];
        if (!Scene) throw new Error(`Tipo de cena desconhecido: ${s.type}`);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.duration} name={`${s.id} · ${s.type}`}>
            <Scene props={s.props} duration={s.duration} />
            <Sequence from={3} durationInFrames={20}>
              <Audio src={staticFile(s.type === 'hook' || s.type === 'stat' ? 'sfx/impact.wav' : 'sfx/pop.wav')} volume={0.55} />
            </Sequence>
            {(s.props.items ?? s.props.points ?? []).map((it: {_at: number}, i: number) => (
              <Sequence key={i} from={it._at} durationInFrames={15}>
                <Audio src={staticFile('sfx/pop.wav')} volume={0.4} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}

      {/* 3. legendas palavra a palavra + elementos fixos */}
      <Captions scenes={scenes} />
      <Chrome timeline={timeline} />

      {/* 4. áudio */}
      {scenes.map((s) => (
        <Sequence key={s.id} from={s.from + s.audioLead} name={`voz ${s.id}`}>
          <Audio src={staticFile(s.audio)} />
        </Sequence>
      ))}
      {timeline.music ? <Audio src={staticFile(timeline.music)} volume={0.1} loop /> : null}
    </AbsoluteFill>
  );
};
