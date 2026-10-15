# UI audio — GTA San Andreas menu reference

Updated 15 October 2026. User requested closer GTA San Andreas menu sounds and explicitly authorized internet lookup. The UI now plays two short local effect excerpts rather than relying on the approximate synth profile.

- Reference page: https://soundfactory.ai/gta-san-andreas-menu-sound/
- Reference recording: https://media.soundfactory.ai/media/2026/01/gta-san-andreas-menu-sound.mp3
- Publisher attribution: SoundFactory page labels the shared recording GTA San Andreas Menu Sound, shared by Krabby. Game attribution: Rockstar Games.
- Supporting sound taxonomy: https://wiki.multitheftauto.com/wiki/Sounds identifies frontend selection sounds separately from other effects.
- `assets/ui-sa-hover.wav`: reference interval 0.150–0.375s, mono first channel, 44.1kHz PCM16, 3ms edge fades; 19,888 bytes; SHA-256 `acfd8535095b435b387675a3b052c66c4068b75a8bb59dd828d6cbb8e4d5cc9c`.
- `assets/ui-sa-click.wav`: reference interval 0.595–0.860s, same processing; 23,418 bytes; SHA-256 `2bf660baa0ab458d7642458c5d35af6c7eb129afdf01a2d605eefc378618cffe`.

Sample loading occurs once after an enabled user gesture, from the website's own origin. Decoded buffers are reused; click cancels the active hover sound. Profiles retain the 2× level multiplier with separate hover/confirm balancing to avoid clipping a single effect. No voice/music clip is included. Existing mute, cross-tab preference, disabled/synthetic-event filtering and autoplay unlock behavior remain. Failed/unsupported decoding uses the previous synthesized fallback; requests time out after 4 seconds and do not retry per click.

Validation: tests/ui-sound-browser.cjs covers desktop/touch/keyboard/mute/persistence and native audio unlock. tests/ui-sound-samples-browser.cjs verifies real decoding, hover/confirm durations, once-only downloads, mute and failure fallback on Edge. The installed Windows WebKit runtime exposes neither AudioContext nor webkitAudioContext, so native audio validation is skipped there; physical Safari/iPhone playback remains unverified. This does not measure perceived loudness on physical speakers.
