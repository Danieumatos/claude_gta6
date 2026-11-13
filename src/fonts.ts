import '@fontsource/anton/400.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import {continueRender, delayRender} from 'remotion';

const handle = delayRender('fontes');
Promise.all([
  document.fonts.load(`400 80px 'Anton'`),
  document.fonts.load(`700 40px 'Montserrat'`),
  document.fonts.load(`800 40px 'Montserrat'`),
  document.fonts.load(`900 40px 'Montserrat'`),
])
  .then(() => document.fonts.ready)
  .finally(() => continueRender(handle));
