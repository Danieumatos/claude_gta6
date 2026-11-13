import React from 'react';
import {AbsoluteFill, Easing, Loop, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp} from './anim';
import {C, TRANSITION_FRAMES} from './theme';
import type {SceneData} from './types';

/** Fundo animado usado enquanto não há gameplay em public/gameplay. */
const Placeholder: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const hue = (index * 47) % 360;
  const scroll = (frame * 9) % 120;
  return (
    <AbsoluteFill style={{background: C.ink, filter: `hue-rotate(${hue}deg)`}}>
      <AbsoluteFill
        style={{background: `linear-gradient(180deg, #1a0b3d 0%, #5b1a8c 34%, #ff2e93 52%, #ff8a00 60%, #12061f 60.2%, #0b0614 100%)`}}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 760,
          width: 620,
          height: 620,
          marginLeft: -310,
          borderRadius: '50%',
          background: `linear-gradient(180deg, ${C.yellow} 0%, ${C.orange} 45%, ${C.pink} 100%)`,
          maskImage: 'repeating-linear-gradient(180deg, #000 0 46px, transparent 46px 60px)',
          WebkitMaskImage: 'repeating-linear-gradient(180deg, #000 0 46px, transparent 46px 60px)',
          boxShadow: `0 0 160px ${C.pink}`,
        }}
      />
      <AbsoluteFill style={{top: 1152, height: 768, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: -1600,
            right: -1600,
            top: -200,
            height: 2400,
            transform: 'perspective(520px) rotateX(74deg)',
            transformOrigin: '50% 0%',
            backgroundImage: `linear-gradient(${C.cyan} 3px, transparent 3px), linear-gradient(90deg, ${C.cyan} 3px, transparent 3px)`,
            backgroundSize: '120px 120px',
            backgroundPosition: `0 ${scroll}px`,
            opacity: 0.55,
          }}
        />
        <AbsoluteFill style={{background: 'linear-gradient(180deg, #12061f 0%, transparent 40%)'}} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 300,
          width: '100%',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          font: `700 26px monospace`,
          letterSpacing: 3,
          filter: `hue-rotate(${-hue}deg)`,
        }}
      >
        GAMEPLAY ENTRA AQUI · public/gameplay
      </div>
    </AbsoluteFill>
  );
};

const Clip: React.FC<{scene: SceneData}> = ({scene}) => {
  const {fps} = useVideoConfig();
  const bg = scene.bg!;
  const video = (
    <OffthreadVideo
      muted
      src={staticFile(bg.src)}
      startFrom={Math.round(bg.startFrom * fps)}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
  );
  return bg.loopFrames ? <Loop durationInFrames={bg.loopFrames}>{video}</Loop> : video;
};

/** Uma camada de fundo por cena; cada uma entra por cima da anterior com uma transição. */
export const BgLayer: React.FC<{scene: SceneData; index: number; total: number}> = ({scene, index, total}) => {
  const frame = useCurrentFrame(); // relativo ao início da camada (meia transição antes da cena)
  const T = TRANSITION_FRAMES;
  const p = index === 0 ? 1 : interpolate(frame, [0, T], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const kenBurns = 1.06 + (frame / total) * 0.1;

  let outer: React.CSSProperties = {};
  let blur = 0;
  switch (scene.transition) {
    case 'slide-left':
      outer = {transform: `translateX(${(1 - p) * 100}%)`};
      blur = Math.sin(p * Math.PI) * 14;
      break;
    case 'slide-up':
      outer = {transform: `translateY(${(1 - p) * 100}%)`};
      blur = Math.sin(p * Math.PI) * 14;
      break;
    case 'circle':
      outer = {clipPath: `circle(${p * 125}% at 50% 42%)`};
      break;
    case 'diagonal':
      outer = {clipPath: `polygon(0 0, ${p * 220}% 0, ${p * 220 - 60}% 100%, 0 100%)`};
      break;
    default:
      outer = {opacity: Math.min(1, p * 1.6), transform: `scale(${1 + (1 - p) * 0.9})`};
      blur = (1 - p) * 18;
  }

  return (
    <AbsoluteFill style={{overflow: 'hidden', ...outer}}>
      <AbsoluteFill style={{transform: `scale(${kenBurns})`, filter: blur > 0.4 ? `blur(${blur}px)` : undefined}}>
        {scene.bg ? <Clip scene={scene} /> : <Placeholder index={index} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Escurecimento fixo para o texto ler bem sobre qualquer gameplay. */
export const Scrim: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(180deg, rgba(8,4,20,0.78) 0%, rgba(8,4,20,0.28) 30%, rgba(8,4,20,0.12) 55%, rgba(8,4,20,0.5) 80%, rgba(8,4,20,0.8) 100%)',
    }}
  />
);

/** Faixa de luz que varre a tela em cada corte. */
export const Streak: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], clamp);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', opacity: Math.sin(p * Math.PI) * 0.9}}>
      <div
        style={{
          position: 'absolute',
          top: -400,
          bottom: -400,
          width: 520,
          left: `${-50 + p * 190}%`,
          transform: 'rotate(18deg)',
          background: `linear-gradient(90deg, transparent, ${C.pink}, #fff, ${C.orange}, transparent)`,
          filter: 'blur(30px)',
        }}
      />
    </AbsoluteFill>
  );
};
