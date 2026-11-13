export type Word = {t: string; start: number; end: number; hl?: boolean};

export type Bg = {src: string; startFrom: number; loopFrames: number | null} | null;

export type TransitionKind = 'zoom' | 'slide-left' | 'slide-up' | 'circle' | 'diagonal';

export type SceneData = {
  id: string;
  type: string;
  props: any;
  from: number;
  duration: number;
  audio: string;
  audioLead: number;
  words: Word[];
  bg: Bg;
  transition: TransitionKind;
};

export type Timeline = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  channel: {name: string; handle: string};
  music: string | null;
  placeholderVoice: boolean;
  scenes: SceneData[];
};
