"""MeloTTS-Synthese (B-79) – läuft in der eigenen Umgebung .venv-melo (Python 3.10).

Aufruf durch generate_audio.py: python melo_synth.py <auftrag.json>
Der Auftrag enthält Sprache, Tempo und eine Liste {"text", "out"}; das Modell wird nur einmal
geladen. Fester Zufallswert je Aufnahme, damit derselbe Text dieselbe Datei ergibt.
"""

import json
import sys


def main(path: str) -> int:
    import random

    import numpy
    import torch
    from melo.api import TTS

    job = json.loads(open(path, encoding='utf-8').read())
    model = TTS(language=job['language'], device='cpu')
    speaker = model.hps.data.spk2id[job['speaker']]
    # Der erste Aufruf nach dem Laden klingt minimal anders als alle weiteren – einmal aufwärmen,
    # damit jede Aufnahme unabhängig von ihrer Position im Auftrag gleich ausfällt.
    model.tts_to_file('bonjour', speaker, job['items'][0]['out'], speed=job['speed'], quiet=True)
    for item in job['items']:
        random.seed(0)
        numpy.random.seed(0)
        torch.manual_seed(0)
        model.tts_to_file(item['text'], speaker, item['out'], speed=job['speed'], quiet=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
