import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {C} from './theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0→1 com mola, começando em `delay` frames. */
export const usePop = (delay = 0, damping = 13, stiffness = 170) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, stiffness, mass: 0.7}});
};

/** 0→1 suave (sem overshoot). */
export const useEase = (delay = 0, dur = 14) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + dur], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
};

/** 1→0 nos últimos frames da cena (saída). */
export const useExit = (duration: number, len = 8) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [duration - len, duration - 1], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
};

/** Texto com *destaque* entre asteriscos. */
export const Rich: React.FC<{text: string; color?: string}> = ({text, color = C.yellow}) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith('*') && part.endsWith('*') ? (
        <span key={i} style={{color}}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

/** Entrada padrão: sobe, escala e aparece. */
export const Pop: React.FC<{
  delay?: number;
  from?: 'bottom' | 'left' | 'right' | 'top' | 'scale';
  dist?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({delay = 0, from = 'bottom', dist = 70, style, children}) => {
  const p = usePop(delay);
  const frame = useCurrentFrame();
  const o = interpolate(frame, [delay, delay + 5], [0, 1], clamp);
  const off = (1 - p) * dist;
  const t =
    from === 'bottom'
      ? `translateY(${off}px)`
      : from === 'top'
        ? `translateY(${-off}px)`
        : from === 'left'
          ? `translateX(${-off}px)`
          : from === 'right'
            ? `translateX(${off}px)`
            : `scale(${0.6 + 0.4 * p})`;
  return <div style={{opacity: o, transform: t, ...style}}>{children}</div>;
};

/** Painel de vidro escuro usado pelos cards. */
export const panel: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(20,10,38,0.92), rgba(11,6,20,0.88))',
  border: '2px solid rgba(255,255,255,0.14)',
  borderRadius: 36,
  boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
};
