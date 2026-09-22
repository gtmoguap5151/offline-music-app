# Sound Sync MVP

Android-first installable offline music PWA prototype.

## Product promise
**Search music → tap Download once → automatic organization → play offline.**

The MVP intentionally avoids general web-search clutter and does not rip or bypass DRM. The built-in demo catalog generates its own test audio locally so the complete download/offline workflow can be tested without copyrighted catalog files or external audio dependencies.

## Current MVP
- Music-only Songs / Artists / Albums search
- One-tap demo download
- IndexedDB offline music storage
- Automatic song / artist / album organization
- Offline library search
- Download queue/progress
- Local audio import
- Offline playback + Media Session metadata
- Storage manager
- Installable PWA shell + service worker
- FREE / PRO / CREATOR entitlement scaffold, with all current features FREE
- No account and no ads

## Source of truth
This GitHub repository is the authoritative project source. Builders and hosts are downstream deployment tools only.

## Rights
Future catalog providers must explicitly authorize downloadable audio. Protected streams from Spotify, YouTube Music, Apple Music, or similar services are not download sources for this app.
