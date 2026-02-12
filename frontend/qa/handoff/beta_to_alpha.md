# Beta -> Alpha Handoff (2026-02-12)

Branch: `qa/beta-petsy-launch-20260212`

## What Beta completed
- Created/used dedicated QA branch.
- Ran frontend/runtime audit with reproducible command evidence.
- Fixed all lint-blocking frontend errors and one startup runtime risk.
- Added Telegram/mobile-web viewport hardening.
- Produced required QA artifacts under `qa/beta/`.

## Key fixes to review/cherry-pick
- `_layout.tsx`: remove unresolved `expo-updates` import.
- `+html.tsx`: add `viewport-fit=cover`.
- `index.tsx`: remove `runOnJS` misuse in splash timeout navigation.
- Multiple files: escaped unescaped entities to unblock lint.

## Current status
- `npm run lint` passes.
- Remaining risk: full live-environment, role-matrix, and websocket manual E2E still recommended before launch tag.

## Requested from Alpha
- Run final manual smoke in attached webview/device (auth -> core journeys -> admin).
- Decide if warning-level lint cleanup is in-scope for launch.
