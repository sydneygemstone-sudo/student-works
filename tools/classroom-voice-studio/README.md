# Classroom Voice Studio · 1.0.0

固定源码基线 / Pinned reusable source baseline. The release contains a local generation workbench and a separate multitrack sampler/arranger. Student audio, references, model weights and consent records are intentionally excluded.

## Three independent layers

1. **Record and perform** — `web/index.html` records locally after permission and a consent acknowledgement. Save the recording on the device. No recording upload endpoint exists in this page.
2. **Clone and compare locally** — `studio/server.py` manages local IndexTTS 2.5 speech and MOSS-SoundEffect v2.0 tasks. Use real emotional references or explicit supported controls. Select/approve takes separately from generation.
3. **Arrange and export** — `web/index.html` imports a private `arrangement.json` plus its audio files. It offers per-track gain/pan/mute/solo, sample pads, event time and velocity editing, local JSON presets, WAV rendering and MIDI event export. It is not a full digital audio workstation.

The recorder, generator and arranger are modular. Recording does not automatically clone a voice; a generated file does not automatically become approved; an arrangement does not automatically replace the original game.

## Verify the fixed version first

```sh
python scripts/verify_release.py
node tests/arranger-core.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
```

The source lock is an integrity check, not an administrative security boundary. Never select this workbench by the newest modification time. Use `STACK-ENTRY.json`, the Git tag and `LOCK.json`. Do not regenerate the lock to hide a mismatch.

## A new local voice workspace

Use a private local copy of this source. The UI server uses Python's standard library; the model adapters need their own already-installed environments. The Windows inference path uses NVIDIA CUDA and a local GPU lock; the Mac is the playback/arrangement endpoint.

```sh
python scripts/init_local.py
# Optional explicit local reference imports (only authorized recordings):
python scripts/init_local.py --reference happy=/local-reference/happy.wav --reference afraid=/local-reference/afraid.wav --reference sad=/local-reference/identity.wav
```

Then edit the ignored `config/engines.json` with the real local interpreter/model paths. `MODEL-VERSIONS.json` pins the model code revisions and weight hashes used by the source baseline. **Do not download or upgrade models silently.** Index and MOSS use separate environments and run serially. Cloud inference, telemetry and network connections are disabled in the generation process.

Edit ignored `config/consent.json` only after checking the recording subject's agreement and any required guardian agreement. `record_location` records where the actual authorization is held, not private family details. The example is deliberately **not authorized**. Missing consent stops speech generation before model loading.

```sh
python studio/server.py
# Open the generation UI on http://127.0.0.1:8916/
```

The legacy reference slot named `sad` is merely a configurable identity slot, not a required emotional performance. Missing references or mismatched hashes fail rather than using an example voice. Use `PERFORMANCE-RECIPES.json` as initial A/B directions, not verified presets for every child. The `settled` setting only changes sampling and low-energy tail handling; it is not a universal emotion/intonation correction.

## Use the separate arranger

```sh
python scripts/serve_pack.py
```

Open the printed loopback address. Use **synthetic demo** to test without any student voice, or select the private folder containing `arrangement.json` and `audio/`. Selecting files reads them into this browser; it does not upload them. To serve a teacher-supplied private pack directly:

```sh
python scripts/serve_pack.py --root /path/to/private-pack --port 18941 --open
```

The private pack's `web/` contains the same frozen web source. Local server roots must never include original recordings, model checkpoints or unrelated folders. The server binds only to loopback; closing its terminal stops it. No LAN/public binding is offered by this launcher.

MIDI hardware is optional and requires a compatible secure-context browser and explicit permission. Sample note numbers live in the private arrangement. CC7 changes gain, CC10 changes pan. Screen pads/digits 1–8 remain usable without MIDI. A `.mid` file contains control events, **not sound samples**; bring the JSON sample map and authorized audio into a sampler separately.

## Digital companion handoff

The implemented export is an RMS-driven `speaking-envelope/1.0` timeline for simple mouth opening. It is **not phoneme-level lip synchronization, avatar image generation, a real-time conversation agent, or a complete digital person**. `docs/COMPANION-INTERFACE.md` specifies the later integration boundary. Do not represent planned components as already implemented.

## What is preserved and what is not published

Original voices, cleaned references, generated takes, source hashes and consent records stay in a private workspace. Public Git holds only code, examples, model revisions, documentation and synthetic-data tests. The original game is a separate consumer and is not changed by this tool.

For cleanup: push the exact source revision, verify a clean restore plus the source ZIP, then remove only the disposable publication worktree. Do not delete the operating private workspace, reference recordings or delivered listening packs.

## Upstream components

IndexTTS: https://github.com/index-tts/index-tts
MOSS-SoundEffect: https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0
Web Audio / optional Web MIDI / MediaRecorder: browser-provided interfaces, no additional hosted service.

Upstream model/code terms remain applicable. This source package is not a redistribution of the models and does not grant rights to any person's voice.
