import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, usePop} from './anim';
import {BODY, C, DISPLAY, GRAD} from './theme';
import type {Timeline} from './types';

/** Elementos fixos: selo do canal e barra de progresso segmentada por cena. */
export const Chrome: React.FC<{timeline: Timeline}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const pop = usePop(4);
  const pulse = 0.55 + 0.45 * Math.sin(frame / 6);

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 96, left: 48, right: 48, display: 'flex', gap: 8}}>
        {timeline.scenes.map((s) => {
          const p = interpolate(frame, [s.from, s.from + s.duration], [0, 1], clamp);
          return (
            <div
              key={s.id}
              style={{flex: s.duration, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.22)', overflow: 'hidden'}}
            >
              <div style={{width: `${p * 100}%`, height: '100%', background: GRAD}} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 124,
          left: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transform: `translateX(${(1 - pop) * -300}px)`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 34,
            letterSpacing: 2,
            color: C.white,
            background: GRAD,
            padding: '6px 20px 4px',
            borderRadius: 12,
            transform: 'skewX(-8deg)',
          }}
        >
          {timeline.channel.name}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: BODY, fontWeight: 800, fontSize: 22, color: C.white, letterSpacing: 2}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: C.red, opacity: pulse, boxShadow: `0 0 14px ${C.red}`}} />
          {Math.max(0, Math.ceil((durationInFrames - frame) / timeline.fps))}s
        </div>
      </div>
      {timeline.placeholderVoice ? (
        <div
          style={{
            position: 'absolute',
            top: 132,
            right: 48,
            fontFamily: BODY,
            fontWeight: 800,
            fontSize: 20,
            color: C.ink,
            background: C.yellow,
            padding: '6px 14px',
            borderRadius: 8,
          }}
        >
          VOZ PROVISÓRIA
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
