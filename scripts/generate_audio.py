"""Erzeugt die Aussprache-Dateien public/audio/<lang>/<id>.mp3 (anforderungen.md §6).

Ablauf je Wort und Sprache:
  1. Quelle: eigene Aufnahme aus audio-overrides/<lang>/<id>.(mp3|wav|m4a), sonst TTS
     (EN: Piper en_US-ljspeech-high; FR: Kokoro ff_siwis; JA: VOICEVOX 冥鳴ひまり aus `jaKana`).
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
# Japanisch mit VOICEVOX (Stil-ID 14 = 冥鳴ひまり ノーマル); die erzeugten Dateien brauchen die
# Namensnennung „VOICEVOX:冥鳴ひまり“ (README).
VOICES = {
    'en': {'engine': 'piper', 'voice': 'en_US-ljspeech-high'},
    'fr': {'engine': 'kokoro', 'voice': 'ff_siwis', 'lang': 'fr-fr'},
    'ja': {'engine': 'voicevox', 'voice': '冥鳴ひまり', 'style': 14},
}
DEFAULT_LANGS = ['en', 'fr', 'ja']
# B-78: Stimmoptionen je Sprache für die Stimmwahl-Seite (tools/stimmwahl.html). Je Wort steht die
# Wahl (Stimme + Variante) in audio-choices.json; ohne Eintrag gilt VOICES mit Variante „word“.
VOICE_OPTIONS = {
    'en': {
        'piper-ljspeech': VOICES['en'],
        'piper-kristin': {'engine': 'piper', 'voice': 'en_US-kristin-medium'},
        'piper-cori': {'engine': 'piper', 'voice': 'en_GB-cori-high'},
        'kokoro-af_heart': {'engine': 'kokoro', 'voice': 'af_heart', 'lang': 'en-us'},
    },
    # B-79: Piper tom (AGPL-Modell). siwis-medium/upmc fallen weg (Lessac-Basis, nur Forschung),
    # mls war im Hörtest unverständlich.
    'fr': {
        'kokoro-siwis': VOICES['fr'],
        'piper-tom': {'engine': 'piper', 'voice': 'fr_FR-tom-medium'},
        'melo-fr': {'engine': 'melo', 'voice': 'FR', 'speaker': 'FR'},
    },
}
# „word“: das Wort allein; „dot“: mit Punkt („egg.“) – endet dann oft sauberer
VARIANTS = {'word': '', 'dot': '.'}
CHOICES_FILE = ROOT / 'audio-choices.json'
# MeloTTS braucht Python 3.10 und eigene Pakete – eigene Umgebung, Aufruf als Unterprozess (B-79)
MELO_PYTHON = ROOT / '.venv-melo' / 'bin' / 'python'
MELO_SCRIPT = ROOT / 'scripts' / 'melo_synth.py'
CANDIDATES_DIR = ROOT / 'tools' / 'stimmwahl'
# Vorgelesen wird die Kana-Lesung, damit Kanji wie 月 nicht falsch gelesen werden (げつ statt つき).
TEXT_FIELDS = {'ja': 'jaKana'}
PIPER_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'
KOKORO_FILES = {
    'kokoro-v1.0.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
    'voices-v1.0.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
}


def piper_files(voice: str) -> dict[str, str]:
    """Modelldateien einer Piper-Stimme, z. B. en_US-ljspeech-high → en/en_US/ljspeech/high/…."""
    region, name, quality = voice.split('-')
    base = f"{PIPER_BASE}/{region.split('_')[0]}/{region}/{name}/{quality}/{voice}"
    return {f'piper/{voice}{ext}': f'{base}{ext}' for ext in ('.onnx', '.onnx.json')}


def model_files(voice: dict) -> dict[str, str]:
    return piper_files(voice['voice']) if voice['engine'] == 'piper' else KOKORO_FILES


def melo_batch(jobs: list['Job'], tmp: Path) -> dict[Path, Path]:
    """Erzeugt alle MeloTTS-Aufnahmen in einem Unterprozess (Modell lädt nur einmal)."""
    if not jobs:
        return {}
    if not MELO_PYTHON.is_file():
        sys.exit('MeloTTS fehlt (.venv-melo) – Einrichtung siehe README.md (Abschnitt „Audio erzeugen“).')
    wavs = {job.output: tmp / f'melo-{i}.wav' for i, job in enumerate(jobs)}
    texts = {job.output: job.text for job in jobs}
    order = tmp / 'melo.json'
    order.write_text(json.dumps({
        'language': jobs[0].voice['voice'],
        'speaker': jobs[0].voice['speaker'],
        'speed': SPEED,
        'items': [{'text': texts[out], 'out': str(wav)} for out, wav in wavs.items()],
    }), encoding='utf-8')
    subprocess.run([str(MELO_PYTHON), str(MELO_SCRIPT), str(order)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return wavs
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
    voice: dict
    label: str  # für die Ausgabe: Stimme und ggf. Variante


def load_choices(path: Path = CHOICES_FILE) -> dict:
    """Gewählte Stimme je Sprache und Wort (B-78); fehlt die Datei, gilt überall der Standard."""
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else {}


def resolve_voice(choices: dict, lang: str, word_id: str) -> tuple[dict, str, str]:
    """(Stimme, Textzusatz, Beschriftung) für ein Wort – gewählte Option oder Standard."""
    choice = choices.get(lang, {}).get(word_id)
    if choice and choice.get('voice') in VOICE_OPTIONS.get(lang, {}) and choice.get('variant') in VARIANTS:
        voice = VOICE_OPTIONS[lang][choice['voice']]
        return voice, VARIANTS[choice['variant']], f"{choice['voice']}, {choice['variant']}"
    return VOICES[lang], '', VOICES[lang]['voice']


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
    words: list[dict],
    langs: list[str],
    out: Path,
    overrides: Path,
    ids: list[str] | None,
    choices: dict | None = None,
) -> list[Job]:
    jobs = []
    for word in words:
        if ids and word['id'] not in ids:
            continue
        for lang in langs:
            voice, suffix, label = resolve_voice(choices or {}, lang, word['id'])
            jobs.append(
                Job(
                    word_id=word['id'],
                    lang=lang,
                    text=word[TEXT_FIELDS.get(lang, lang)] + suffix,
                    output=out / lang / f"{word['id']}.mp3",
                    override=find_override(overrides, lang, word['id']),
                    voice=voice,
                    label=label,
                )
            )
    return jobs


def plan_candidates(words: list[dict], lang: str, out: Path, ids: list[str] | None) -> list[Job]:
    """Alle Stimmoptionen × Varianten einer Sprache für die Stimmwahl-Seite (B-78)."""
    jobs = []
    for word in words:
        if ids and word['id'] not in ids:
            continue
        for key, voice in VOICE_OPTIONS[lang].items():
            for variant, suffix in VARIANTS.items():
                jobs.append(
                    Job(
                        word_id=word['id'],
                        lang=lang,
                        text=word[TEXT_FIELDS.get(lang, lang)] + suffix,
                        output=out / lang / f'{key}-{variant}' / f"{word['id']}.mp3",
                        override=None,
                        voice=voice,
                        label=f'{key}, {variant}',
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


VOICEVOX_DIR = 'voicevox'
VOICEVOX_FILES = ['dict/open_jtalk_dic_utf_8-1.11', 'onnxruntime/lib', 'models/vvms']


class Engines:
    """Lädt Kokoro bzw. Piper erst, wenn eine Sprache sie braucht."""

    def __init__(self, models: Path):
        self.models = models
        self.loaded: dict[str, object] = {}

    def get(self, voice: dict):
        engine = voice['engine']
        # Piper: ein Modell je Stimme; Kokoro und VOICEVOX laden alle Stimmen auf einmal
        key = f"piper:{voice['voice']}" if engine == 'piper' else engine
        if key not in self.loaded:
            if engine == 'kokoro':
                from kokoro_onnx import Kokoro

                self.loaded[key] = Kokoro(
                    str(self.models / 'kokoro-v1.0.onnx'), str(self.models / 'voices-v1.0.bin')
                )
            elif engine == 'voicevox':
                self.loaded[key] = self._voicevox()
            else:
                from piper import PiperVoice

                self.loaded[key] = PiperVoice.load(
                    str(self.models / 'piper' / f"{voice['voice']}.onnx")
                )
        return self.loaded[key]

    def _voicevox(self):
        from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

        root = self.models / VOICEVOX_DIR
        runtime = next((root / 'onnxruntime/lib').glob('libvoicevox_onnxruntime*'))
        synth = Synthesizer(
            Onnxruntime.load_once(filename=str(runtime)),
            OpenJtalk(str(root / 'dict/open_jtalk_dic_utf_8-1.11')),
        )
        style = VOICES['ja']['style']
        for vvm in sorted((root / 'models/vvms').glob('*.vvm')):
            with VoiceModelFile.open(vvm) as model:
                if any(s.id == style for c in model.metas for s in c.styles):
                    synth.load_voice_model(model)
                    return synth
        sys.exit(f'VOICEVOX-Stil {style} nicht gefunden in {root}/models/vvms.')


def synthesize(engines: Engines, text: str, voice: dict, target: Path) -> None:
    if voice['engine'] == 'voicevox':
        synth = engines.get(voice)
        query = synth.create_audio_query(text, voice['style'])
        query.speed_scale = SPEED
        target.write_bytes(synth.synthesis(query, voice['style']))
        return
    if voice['engine'] == 'piper':
        import wave

        from piper import SynthesisConfig

        with wave.open(str(target), 'wb') as wav:
            config = SynthesisConfig(length_scale=1 / SPEED, speaker_id=voice.get('speaker'))
            engines.get(voice).synthesize_wav(text, wav, syn_config=config)
        return

    import soundfile as sf

    samples, rate = engines.get(voice).create(
        text, voice=voice['voice'], speed=SPEED, lang=voice['lang']
    )
    sf.write(target, samples, rate)


def ensure_models(models: Path, voices: list[dict], download: bool) -> None:
    if any(v['engine'] == 'voicevox' for v in voices):
        root = models / VOICEVOX_DIR
        missing = [f for f in VOICEVOX_FILES if not (root / f).exists()]
        if missing:
            # Kein automatischer Download: dabei muss man den Nutzungsbedingungen zustimmen.
            sys.exit(
                f"VOICEVOX fehlt in {root}: {', '.join(missing)}.\n"
                'Einrichtung (mit Zustimmung zu den Nutzungsbedingungen) siehe README.md '
                '(Abschnitt „Audio erzeugen“).'
            )
    files = {
        name: url
        for voice in voices
        if voice['engine'] != 'voicevox'
        for name, url in model_files(voice).items()
    }
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
    parser.add_argument('--candidates', action='store_true',
                        help='alle Stimmoptionen der Sprache für die Stimmwahl-Seite erzeugen (B-78)')
    parser.add_argument('--choices', type=Path, default=CHOICES_FILE)
    parser.add_argument('--candidates-out', type=Path, default=CANDIDATES_DIR)
    parser.add_argument('--download-models', action='store_true',
                        help='fehlende Sprachmodelle (Kokoro, Piper) automatisch herunterladen')
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not shutil.which('ffmpeg'):
        sys.exit('ffmpeg nicht gefunden – bitte installieren (siehe README.md).')

    words = json.loads(args.words.read_text(encoding='utf-8'))
    langs = list(dict.fromkeys(args.langs or DEFAULT_LANGS))
    if args.candidates:
        langs = [lang for lang in langs if lang in VOICE_OPTIONS]
        planned = [j for lang in langs for j in plan_candidates(words, lang, args.candidates_out, args.ids)]
    else:
        planned = plan_jobs(words, langs, args.out, args.overrides, args.ids, load_choices(args.choices))
    jobs = [job for job in planned if needs_update(job, args.force)]
    if not jobs:
        print('Alles aktuell – nichts zu tun.')
        return 0

    needed = list({json.dumps(j.voice, sort_keys=True): j.voice for j in jobs if j.override is None}.values())
    ensure_models(args.models, [v for v in needed if v['engine'] != 'melo'], args.download_models)
    engines = Engines(args.models)

    with tempfile.TemporaryDirectory() as tmp:
        melo = melo_batch([j for j in jobs if j.override is None and j.voice['engine'] == 'melo'], Path(tmp))
        for job in jobs:
            source = job.override or melo.get(job.output)
            if source is None:
                source = Path(tmp) / f'{job.lang}-{job.word_id}.wav'
                synthesize(engines, job.text, job.voice, source)
            postprocess(source, job.output)
            origin = 'Override' if job.override else job.label
            print(f'{job.output.relative_to(job.output.parents[1])}  „{job.text}“  ({origin})')

    print(f'{len(jobs)} Datei(en) erzeugt.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
