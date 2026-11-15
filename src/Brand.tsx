import React from 'react';
import {Img, staticFile} from 'remotion';
import {siInstagram, siTiktok, siYoutube} from 'simple-icons';
import {C, DISPLAY} from './theme';

/** Emblema da palmeira (recortado do logo do canal). */
export const Emblem: React.FC<{size: number; style?: React.CSSProperties}> = ({size, style}) => (
  <Img src={staticFile('brand/emblema.png')} style={{width: size, height: size, display: 'block', ...style}} />
);

/** Texto do logo: rosa, contorno escuro e contorno ciano com brilho, em camadas. */
export const Wordmark: React.FC<{lines: string[]; size: number; align?: 'left' | 'center'}> = ({lines, size, align = 'left'}) => {
  const base: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontSize: size,
    lineHeight: 0.92,
    letterSpacing: size * 0.02,
    textAlign: align,
    whiteSpace: 'pre',
    textTransform: 'uppercase',
  };
  const text = lines.join('\n');
  return (
    <div style={{position: 'relative', display: 'inline-block'}}>
      <div
        aria-hidden
        style={{...base, position: 'absolute', inset: 0, color: C.cyan, WebkitTextStroke: `${size * 0.22}px ${C.cyan}`,
          filter: `drop-shadow(0 0 ${size * 0.18}px ${C.cyan}) drop-shadow(0 0 ${size * 0.08}px ${C.cyan})`}}
      >
        {text}
      </div>
      <div aria-hidden style={{...base, position: 'absolute', inset: 0, color: C.ink, WebkitTextStroke: `${size * 0.14}px ${C.ink}`}}>
        {text}
      </div>
      <div style={{...base, position: 'relative', color: C.pink}}>{text}</div>
    </div>
  );
};

type Icon = {path: string; hex: string};
const ICONS: Record<string, Icon> = {instagram: siInstagram, youtube: siYoutube, tiktok: siTiktok};

const BG: Record<string, string> = {
  instagram: 'linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 55%, #962FBF 80%, #4F5BD5 100%)',
  youtube: '#FF0000',
  tiktok: '#000000',
};

/** Logo da plataforma em um selo redondo, nas cores de cada rede. */
export const PlatformBadge: React.FC<{platform: string; size: number}> = ({platform, size}) => {
  const icon = ICONS[platform];
  if (!icon) return null;
  const glyph = (color: string, dx = 0, dy = 0) => (
    <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52} style={{position: 'absolute', transform: `translate(${dx}px, ${dy}px)`}}>
      <path d={icon.path} fill={color} />
    </svg>
  );
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: BG[platform],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 0 5px ${C.ink}, 0 0 0 9px ${C.cyan}, 0 0 34px ${C.cyan}aa, 0 18px 40px rgba(0,0,0,0.6)`,
      }}
    >
      {platform === 'tiktok' ? (
        <>
          {glyph('#25F4EE', -size * 0.025, -size * 0.02)}
          {glyph('#FE2C55', size * 0.025, size * 0.02)}
          {glyph('#FFFFFF')}
        </>
      ) : (
        glyph('#FFFFFF')
      )}
    </div>
  );
};
