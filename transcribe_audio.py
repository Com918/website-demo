import json
import wave
from pathlib import Path

import mlx_whisper
import numpy as np


audio_path = Path("tmp/pdfs/consultation.wav")
output_path = Path("tmp/pdfs/transcript_raw.json")

with wave.open(str(audio_path), "rb") as wav:
    samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0

result = mlx_whisper.transcribe(
    samples,
    path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
    language="en",
    task="transcribe",
    initial_prompt="This is an academic consultation about Assignment One, SDGs, CTAs (calls to action), web design, RMIT, nutrition, HIV/AIDS, architecture, ecology, trees, plants, and creative experiments.",
    clip_timestamps="0,711",
    word_timestamps=False,
    verbose=True,
)

output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Detected language: {result.get('language')}")
print(f"Segments: {len(result.get('segments', []))}")
print(f"Saved: {output_path}")
