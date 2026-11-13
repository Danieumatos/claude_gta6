import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import type {Timeline} from './types';

const empty: Timeline = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 90,
  channel: {name: 'GTA 6 RADAR', handle: '@seucanal'},
  music: null,
  placeholderVoice: false,
  scenes: [],
};

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={Video as unknown as React.FC<Record<string, unknown>>}
    defaultProps={{timeline: empty}}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={90}
    calculateMetadata={({props}) => {
      const t = (props as {timeline: Timeline}).timeline;
      return {fps: t.fps, width: t.width, height: t.height, durationInFrames: t.durationInFrames};
    }}
  />
);
