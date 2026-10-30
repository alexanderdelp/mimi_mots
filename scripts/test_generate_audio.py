"""Tests für generate_audio.py: Unit-Tests der Hilfsfunktionen und Akzeptanztests B-30a/B-64/B-67,
die das echte Skript (Kokoro, Piper, VOICEVOX und ffmpeg) in einem Temp-Ordner laufen lassen.
Aufruf: npm run test:audio
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_audio as ga  # noqa: E402

WORDS = [
    {'id': 'apfel', 'emoji': '🍎', 'de': 'Apfel', 'en': 'apple', 'fr': 'la pomme',
     'ja': 'りんご', 'jaKana': 'りんご'},
    {'id': 'katze', 'emoji': '🐱', 'de': 'Katze', 'en': 'cat', 'fr': 'le chat',
     'ja': '猫', 'jaKana': 'ねこ'},
]


def probe(path: Path) -> dict:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries',
         'stream=codec_name,channels,bit_rate:format=duration', '-of', 'json', str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    return {**data['streams'][0], 'duration': float(data['format']['duration'])}


def silences(path: Path) -> list[tuple[float, float | None]]:
    err = subprocess.run(
        ['ffmpeg', '-hide_banner', '-nostats', '-i', str(path),
         '-af', 'silencedetect=n=-45dB:d=0.05', '-f', 'null', '-'],
        capture_output=True, text=True, check=True,
    ).stderr
    starts = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    return [(s, ends[i] if i < len(ends) else None) for i, s in enumerate(starts)]


def run_script(*args: str) -> str:
    buf = StringIO()
    with redirect_stdout(buf):
        ga.main(list(args))
    return buf.getvalue()


class HelperTests(unittest.TestCase):
    def test_parse_integrated_loudness(self):
        text = 'frames…\n[Parsed_ebur128_0 @ x] Summary:\n\n  Integrated loudness:\n    I:  -18.3 LUFS\n'
        self.assertEqual(ga.parse_integrated_loudness(text), -18.3)

    def test_parse_loudness_silent(self):
        with self.assertRaises(ValueError):
            ga.parse_integrated_loudness('Summary:\n    I:  -inf LUFS\n')

    def test_plan_jobs_paths_texts_and_filter(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'audio'
            jobs = ga.plan_jobs(WORDS, ['en', 'fr'], out, Path(tmp) / 'ov', ['katze'])
            self.assertEqual([(j.lang, j.text) for j in jobs], [('en', 'cat'), ('fr', 'le chat')])
            self.assertEqual(jobs[1].output, out / 'fr' / 'katze.mp3')
            self.assertIsNone(jobs[0].override)
            ja = ga.plan_jobs(WORDS, ['ja'], out, Path(tmp) / 'ov', ['katze'])
            self.assertEqual(ja[0].text, 'ねこ')  # Kana-Lesung statt Kanji (B-67)

    def test_find_override_prefers_known_extensions(self):
        with tempfile.TemporaryDirectory() as tmp:
            ov = Path(tmp)
            (ov / 'fr').mkdir()
            (ov / 'fr' / 'apfel.txt').write_text('x')
            self.assertIsNone(ga.find_override(ov, 'fr', 'apfel'))
            (ov / 'fr' / 'apfel.wav').write_bytes(b'x')
            self.assertEqual(ga.find_override(ov, 'fr', 'apfel'), ov / 'fr' / 'apfel.wav')

    def test_needs_update(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'a.mp3'
            ov = Path(tmp) / 'a.wav'
            job = ga.Job('a', 'en', 'a', out, None, ga.VOICES['en'], '')
            self.assertTrue(ga.needs_update(job, force=False))  # fehlt
            out.write_bytes(b'x')
            self.assertFalse(ga.needs_update(job, force=False))
            self.assertTrue(ga.needs_update(job, force=True))
            ov.write_bytes(b'x')
            os.utime(ov, (time.time() + 10, time.time() + 10))
            self.assertTrue(ga.needs_update(ga.Job('a', 'en', 'a', out, ov, ga.VOICES['en'], ''), force=False))

    def test_default_all_languages(self):
        self.assertEqual(ga.DEFAULT_LANGS, ['en', 'fr', 'ja'])
        self.assertIsNone(ga.parse_args([]).langs)

    def test_choices_pick_voice_and_variant(self):
        """B-78: gewählte Stimme/Variante je Wort, Unbekanntes fällt auf den Standard zurück."""
        choices = {
            'en': {
                'katze': {'voice': 'kokoro-af_heart', 'variant': 'dot'},
                'apfel': {'voice': 'gibt-es-nicht', 'variant': 'word'},
            }
        }
        with tempfile.TemporaryDirectory() as tmp:
            jobs = ga.plan_jobs(WORDS, ['en'], Path(tmp), Path(tmp) / 'ov', None, choices)
        by_id = {j.word_id: j for j in jobs}
        self.assertEqual(by_id['katze'].text, 'cat.')
        self.assertEqual(by_id['katze'].voice, ga.VOICE_OPTIONS['en']['kokoro-af_heart'])
        self.assertEqual(by_id['apfel'].text, 'apple')
        self.assertEqual(by_id['apfel'].voice, ga.VOICES['en'])

    def test_candidates_cover_all_options(self):
        with tempfile.TemporaryDirectory() as tmp:
            jobs = ga.plan_candidates(WORDS, 'en', Path(tmp), ['katze'])
        names = sorted(f'{j.output.parent.name}/{j.output.name}' for j in jobs)
        expected = sorted(
            f'{k}-{v}/katze.mp3' for k in ga.VOICE_OPTIONS['en'] for v in ga.VARIANTS
        )
        self.assertEqual(names, expected)
        self.assertIn('cat.', {j.text for j in jobs})

    def test_french_options(self):
        """B-79: Französisch mit Kokoro siwis, zwei mls-Sprechern und tom."""
        options = ga.VOICE_OPTIONS['fr']
        self.assertEqual(options['kokoro-siwis'], ga.VOICES['fr'])
        self.assertEqual({options['piper-mls-1840']['speaker'], options['piper-mls-3698']['speaker']}, {0, 1})
        with tempfile.TemporaryDirectory() as tmp:
            jobs = ga.plan_candidates(WORDS, 'fr', Path(tmp), ['katze'])
        self.assertEqual(len(jobs), len(options) * len(ga.VARIANTS))
        self.assertIn('le chat.', {j.text for j in jobs})

    def test_piper_files(self):
        self.assertEqual(
            ga.piper_files('en_GB-cori-high')['piper/en_GB-cori-high.onnx'],
            f'{ga.PIPER_BASE}/en/en_GB/cori/high/en_GB-cori-high.onnx',
        )

    def test_voices(self):
        self.assertEqual(ga.VOICES['en'], {'engine': 'piper', 'voice': 'en_US-ljspeech-high'})
        self.assertEqual(ga.VOICES['fr']['engine'], 'kokoro')
        self.assertEqual(ga.VOICES['fr']['voice'], 'ff_siwis')
        self.assertEqual(ga.VOICES['ja'], {'engine': 'voicevox', 'voice': '冥鳴ひまり', 'style': 14})


class AcceptanceTests(unittest.TestCase):
    """B-30a/B-64/B-67 – echtes Skript mit Kokoro, Piper, VOICEVOX und ffmpeg."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = Path(cls.tmp.name)
        cls.words = root / 'words.json'
        cls.words.write_text(json.dumps(WORDS, ensure_ascii=False), encoding='utf-8')
        cls.out = root / 'audio'
        cls.overrides = root / 'overrides'
        cls.args = ['--words', str(cls.words), '--out', str(cls.out),
                    '--overrides', str(cls.overrides), '--choices', str(root / 'keine.json')]
        cls.log = run_script(*cls.args)
        cls.files = sorted(cls.out.rglob('*.mp3'))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_at_30a_1_files_per_language(self):
        names = [f'{p.parent.name}/{p.name}' for p in self.files]
        self.assertEqual(names, ['en/apfel.mp3', 'en/katze.mp3', 'fr/apfel.mp3', 'fr/katze.mp3',
                                 'ja/apfel.mp3', 'ja/katze.mp3'])
        self.assertIn('„ねこ“  (冥鳴ひまり)', self.log)
        self.assertIn('„la pomme“  (ff_siwis)', self.log)
        self.assertIn('„apple“  (en_US-ljspeech-high)', self.log)

    def test_at_30a_2_format_and_size(self):
        for path in self.files:
            info = probe(path)
            with self.subTest(path.name):
                self.assertEqual(info['codec_name'], 'mp3')
                self.assertEqual(info['channels'], 1)
                self.assertEqual(int(info['bit_rate']), 64000)
                self.assertGreater(info['duration'], 0.3)
                self.assertLessEqual(info['duration'], 2.0)
                self.assertLess(path.stat().st_size, 16 * 1024)

    def test_at_30a_3_loudness_and_silence(self):
        for path in self.files:
            with self.subTest(path.name):
                lufs = ga.measure_loudness(path)
                self.assertAlmostEqual(lufs, ga.TARGET_LUFS, delta=1.5)
                gaps = silences(path)
                self.assertTrue(gaps and gaps[0][0] <= 0.01, f'kein Vorlauf: {gaps}')
                self.assertGreaterEqual(gaps[0][1], 0.10)
                self.assertLessEqual(gaps[0][1], 0.25)
                duration = probe(path)['duration']
                trailing = [s for s, e in gaps if e is None or e >= duration - 0.05]
                if trailing:
                    self.assertLess(duration - trailing[-1], 0.3)

    def test_at_30a_4_only_missing_then_force(self):
        before = {p: p.read_bytes() for p in self.files}
        log = run_script(*self.args)
        self.assertIn('nichts zu tun', log)
        self.assertEqual({p: p.read_bytes() for p in self.files}, before)
        log = run_script(*self.args, '--force', '--id', 'apfel', '--lang', 'en', '--lang', 'en')
        self.assertIn('1 Datei(en) erzeugt', log)

    def test_at_30a_5_override_wins(self):
        target = self.out / 'fr' / 'katze.mp3'
        tts_bytes = target.read_bytes()
        (self.overrides / 'fr').mkdir(parents=True, exist_ok=True)
        override = self.overrides / 'fr' / 'katze.wav'
        subprocess.run(['ffmpeg', '-hide_banner', '-y', '-f', 'lavfi',
                        '-i', 'sine=frequency=440:duration=0.6', str(override)],
                       capture_output=True, check=True)
        os.utime(override, (time.time() + 5, time.time() + 5))
        log = run_script(*self.args)
        self.assertIn('fr/katze.mp3  „le chat“  (Override)', self.log + log)
        self.assertNotEqual(target.read_bytes(), tts_bytes)
        self.assertAlmostEqual(probe(target)['duration'], 0.75, delta=0.15)  # 150 ms + 0,6 s
        self.assertAlmostEqual(ga.measure_loudness(target), ga.TARGET_LUFS, delta=1.5)

    def test_at_30a_6_missing_model_message(self):
        for lang, missing in [('fr', 'kokoro-v1.0.onnx'), ('en', 'en_US-ljspeech-high.onnx'),
                              ('ja', 'dict/open_jtalk_dic_utf_8-1.11')]:
            with self.subTest(lang), tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(SystemExit) as ctx:
                    run_script('--words', str(self.words), '--out', str(Path(tmp) / 'a'),
                               '--models', str(Path(tmp) / 'leer'), '--lang', lang)
                self.assertIn('README', str(ctx.exception))
                self.assertIn(missing, str(ctx.exception))


if __name__ == '__main__':
    unittest.main(verbosity=2)
