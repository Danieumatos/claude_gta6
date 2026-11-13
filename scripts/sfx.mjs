// Gera os efeitos sonoros (whoosh, pop, impact) com ffmpeg — sem depender de bancos de áudio.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';

const dir = 'public/sfx';
mkdirSync(dir, {recursive: true});
const ff = (out, args) => {
  if (existsSync(`${dir}/${out}`)) return;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, `${dir}/${out}`]);
};

ff('whoosh.wav', [
  '-f', 'lavfi', '-i', 'anoisesrc=d=0.5:c=pink:a=0.9',
  '-af', "bandpass=f=1400:w=1200,volume='0.9*sin(PI*t/0.5)*sin(PI*t/0.5)':eval=frame,aphaser=speed=2,highpass=f=300",
]);
ff('pop.wav', [
  '-f', 'lavfi', '-i', "aevalsrc='0.7*sin(2*PI*(520+900*exp(-t*40))*t)*exp(-t*28)':d=0.22",
]);
ff('impact.wav', [
  '-f', 'lavfi', '-i', "aevalsrc='0.95*sin(2*PI*(42+120*exp(-t*18))*t)*exp(-t*5.5)':d=0.9",
  '-f', 'lavfi', '-i', 'anoisesrc=d=0.9:c=brown:a=0.8',
  '-filter_complex', "[1:a]volume='exp(-t*14)':eval=frame,lowpass=f=2500[n];[0:a][n]amix=inputs=2:normalize=0",
]);
console.log('sfx ok');
