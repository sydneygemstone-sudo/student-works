# Digital companion interface · 1.0

## Implemented now

The arranger can export the selected voice stem's RMS energy at 20 frames per second. The JSON schema is `speaking-envelope/1.0`; each frame has `t` (seconds) and `mouthOpen` (0–1). The exported document states the method and its limitations. A character renderer may map that value to a simple mouth blend shape and map the story's scene/approved emotion recipe to a separate expression.

## Required later, not implemented by this release

An avatar artwork/rig pipeline, a phoneme/viseme aligner for precise lip sync, a conversational agent with memory and permissions, live audio streaming, and a real-time renderer must be separately implemented and tested. No public student voice endpoint is created by this package.

## Recommended data boundary

Keep `voice_asset_id`, model version, reference ID (never raw bytes), scene ID, target emotion, language and approval state in a private manifest. Only approved assets may enter a runtime character. Treat mouth motion, facial expression and conversational state as independent channels. A fear expression must not be inferred solely from a file name or a pitch shift.

The child chooses the role and intended expression, performs the reference, compares drafts and approves the performance with the teacher. A saved local preset is not guardian consent and is not a teacher's final approval.
