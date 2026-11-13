"""Narração com o Kokoro (modelo de voz aberto, roda local, sem custo).
Uso: python3 scripts/tts.py <voz> <velocidade> <saida.wav> <texto>"""
import sys
import soundfile as sf
from kokoro_onnx import Kokoro

voice, speed, out, text = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
kokoro = Kokoro('models/kokoro-v1.0.onnx', 'models/voices-v1.0.bin')
audio, rate = kokoro.create(text, voice=voice, speed=speed, lang='pt-br')
sf.write(out, audio, rate)
