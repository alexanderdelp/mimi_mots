"""Erzeugt die Aussprache-Dateien public/audio/<lang>/<id>.mp3 (anforderungen.md §6).

Ablauf je Wort und Sprache:
  1. Quelle: eigene Aufnahme aus audio-overrides/<lang>/<id>.(mp3|wav|m4a), sonst TTS
     (EN: Piper en_US-ljspeech-high; FR: Kokoro ff_siwis).
  2. Nachbearbeitung mit ffmpeg: Stille vorn/hinten weg, 150 ms Vorlauf, Lautheit −16 LUFS,
     MP3 mono 64 kbit/s.
Vorhandene Dateien werden nur neu erzeugt, wenn eine neuere Override-Datei vorliegt oder
--force gesetzt ist. Einrichtung (venv, Modell): siehe README.md.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Englisch mit Piper: Kokoro (bf_emma u. a.) sprach bei Einzelwörtern einen falschen
# Anfangslaut mit. ljspeech ist public domain; Piper-Stimmen auf Lessac-Basis sind nur für
# Forschung lizenziert (anforderungen.md §11).
VOICES = {
    'en': {'engine': 'piper', 'voice': 'en_US-ljspeech-high'},
    'fr': {'engine': 'kokoro', 'voice': 'ff_siwis', 'lang': 'fr-fr'},
}
DEFAULT_LANGS = ['en', 'fr']
PIPER_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ljspeech/high'
MODEL_FILES = {
    'kokoro': {
        'kokoro-v1.0.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
        'voices-v1.0.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
    },
    'piper': {
        'piper/en_US-ljspeech-high.onnx': f'{PIPER_URL}/en_US-ljspeech-high.onnx',
        'piper/en_US-ljspeech-high.onnx.json': f'{PIPER_URL}/en_US-ljspeech-high.onnx.json',
    },
}
OVERRIDE_EXTENSIONS = ('.mp3', '.wav', '.m4a')

TARGET_LUFS = -16.0
LEAD_IN_MS = 150
SPEED = 0.9
SAMPLE_RATE = 24000
BITRATE = '64k'


@dataclass(frozen=True)
class Job:
    word_id: str
    lang: str
    text: str
    output: Path
    override: Path | None


def find_override(overrides: Path, lang: str, word_id: str) -> Path | None:
    for ext in OVERRIDE_EXTENSIONS:
        candidate = overrides / lang / f'{word_id}{ext}'
        if candidate.is_file():
            return candidate
    return None


def needs_update(job: Job, force: bool) -> bool:
    """Neu erzeugen, wenn erzwungen, wenn die Datei fehlt oder ein neueres Override vorliegt."""
    if force or not job.output.is_file():
        return True
    return job.override is not None and job.override.stat().st_mtime > job.output.stat().st_mtime


def plan_jobs(
    words: list[dict], langs: list[str], out: Path, overrides: Path, ids: list[str] | None
) -> list[Job]:
    jobs = []
    for word in words:
        if ids and word['id'] not in ids:
            continue
        for lang in langs:
            jobs.append(
                Job(
                    word_id=word['id'],
                    lang=lang,
                    text=word[lang],
                    output=out / lang / f"{word['id']}.mp3",
                    override=find_override(overrides, lang, word['id']),
                )
            )
    return jobs


def trim_filter() -> str:
    """Stille am Anfang und Ende entfernen (Ende über umgedrehtes Signal)."""
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02'
    return f'{trim},areverse,{trim},areverse'


def parse_integrated_loudness(ebur128_output: str) -> float:
    """Liest den integrierten Lautheitswert (LUFS) aus der Zusammenfassung von ffmpeg ebur128."""
    summary = ebur128_output.rsplit('Summary:', 1)[-1]
    match = re.search(r'I:\s*(-?\d+(?:\.\d+)?|-inf)\s*LUFS', summary)
    if not match or match.group(1) == '-inf':
        raise ValueError('Lautheit nicht messbar (Datei still?)')
    return float(match.group(1))


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=True)


def measure_loudness(wav: Path) -> float:
    # ebur128 braucht ≥ 400 ms Signal; kurze Wörter werden für die Messung aufgefüllt
    result = run([
        'ffmpeg', '-hide_banner', '-nostats', '-i', str(wav),
        '-af', 'apad=whole_dur=0.5,ebur128=framelog=quiet', '-f', 'null', '-',
    ])
    return parse_integrated_loudness(result.stderr)


def postprocess(source: Path, output: Path) -> None:
    """Trimmen → Lautheit −16 LUFS → 150 ms Vorlauf → MP3 mono 64 kbit/s."""
    with tempfile.TemporaryDirectory() as tmp:
        trimmed = Path(tmp) / 'trimmed.wav'
        run([
            'ffmpeg', '-hide_banner', '-y', '-i', str(source),
            '-af', trim_filter(), '-ac', '1', '-ar', str(SAMPLE_RATE), str(trimmed),
        ])
        gain = TARGET_LUFS - measure_loudness(trimmed)
        output.parent.mkdir(parents=True, exist_ok=True)
        run([
            'ffmpeg', '-hide_banner', '-y', '-i', str(trimmed),
            '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false,adelay={LEAD_IN_MS}:all=1',
            '-ac', '1', '-ar', str(SAMPLE_RATE),
            '-codec:a', 'libmp3lame', '-b:a', BITRATE, '-map_metadata', '-1', str(output),
        ])


class Engines:
    """Lädt Kokoro bzw. Piper erst, wenn eine Sprache sie braucht."""

    def __init__(self, models: Path):
        self.models = models
        self.loaded: dict[str, object] = {}

    def get(self, engine: str):
        if engine not in self.loaded:
            if engine == 'kokoro':
                from kokoro_onnx import Kokoro

                self.loaded[engine] = Kokoro(
                    str(self.models / 'kokoro-v1.0.onnx'), str(self.models / 'voices-v1.0.bin')
                )
            else:
                from piper import PiperVoice

                self.loaded[engine] = PiperVoice.load(
                    str(self.models / 'piper' / f"{VOICES['en']['voice']}.onnx")
                )
        return self.loaded[engine]


def synthesize(engines: Engines, text: str, lang: str, target: Path) -> None:
    voice = VOICES[lang]
    if voice['engine'] == 'piper':
        import wave

        from piper import SynthesisConfig

        with wave.open(str(target), 'wb') as wav:
            engines.get('piper').synthesize_wav(
                text, wav, syn_config=SynthesisConfig(length_scale=1 / SPEED)
            )
        return

    import soundfile as sf

    samples, rate = engines.get('kokoro').create(
        text, voice=voice['voice'], speed=SPEED, lang=voice['lang']
    )
    sf.write(target, samples, rate)


def ensure_models(models: Path, engines: set[str], download: bool) -> None:
    files = {name: url for e in sorted(engines) for name, url in MODEL_FILES[e].items()}
    missing = [name for name in files if not (models / name).is_file()]
    if not missing:
        return
    if not download:
        sys.exit(
            f"Sprachmodell fehlt in {models}: {', '.join(missing)}.\n"
            'Einrichtung siehe README.md (Abschnitt „Audio erzeugen“) oder mit '
            '--download-models automatisch laden (Kokoro ~350 MB, Piper ~110 MB).'
        )
    for name in missing:
        print(f'Lade {name} …')
        (models / name).parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(files[name], models / name)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Erzeugt fehlende Aussprache-Dateien (MP3) für die Wortliste.'
    )
    parser.add_argument('--words', type=Path, default=ROOT / 'src/data/words.json')
    parser.add_argument('--out', type=Path, default=ROOT / 'public/audio')
    parser.add_argument('--overrides', type=Path, default=ROOT / 'audio-overrides')
    parser.add_argument('--models', type=Path, default=ROOT / '.models')
    parser.add_argument('--lang', dest='langs', action='append', choices=sorted(VOICES),
                        help=f"nur diese Sprache(n), Standard: {', '.join(DEFAULT_LANGS)}")
    parser.add_argument('--id', dest='ids', action='append', help='nur diese Wort-id(s)')
    parser.add_argument('--force', action='store_true', help='auch vorhandene Dateien neu erzeugen')
    parser.add_argument('--download-models', action='store_true',
                        help='fehlende Sprachmodelle (Kokoro, Piper) automatisch herunterladen')
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not shutil.which('ffmpeg'):
        sys.exit('ffmpeg nicht gefunden – bitte installieren (siehe README.md).')

    words = json.loads(args.words.read_text(encoding='utf-8'))
    jobs = [
        job
        for job in plan_jobs(
            words, list(dict.fromkeys(args.langs or DEFAULT_LANGS)), args.out, args.overrides, args.ids
        )
        if needs_update(job, args.force)
    ]
    if not jobs:
        print('Alles aktuell – nichts zu tun.')
        return 0

    needed = {VOICES[job.lang]['engine'] for job in jobs if job.override is None}
    ensure_models(args.models, needed, args.download_models)
    engines = Engines(args.models)

    with tempfile.TemporaryDirectory() as tmp:
        for job in jobs:
            source = job.override
            if source is None:
                source = Path(tmp) / f'{job.lang}-{job.word_id}.wav'
                synthesize(engines, job.text, job.lang, source)
            postprocess(source, job.output)
            origin = 'Override' if job.override else VOICES[job.lang]['voice']
            print(f'{job.lang}/{job.word_id}.mp3  „{job.text}“  ({origin})')

    print(f'{len(jobs)} Datei(en) erzeugt.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
