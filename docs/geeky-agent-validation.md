# Geeky integration verification — 2026-10-28

Baseline: Cotizador 47bc9337a9633d2a536f965f7fd701ec5313b608.
Runtime: geeky-agent 0.1.0, source 0222867adcb94ab3225fb2b61ebff68c3a8cdce1.
Implementation PR: https://github.com/GuateGeeks/geeky-agent/pull/1.

## Automated evidence

- Existing baseline: 133 Node tests passed.
- Cotizador integration: 148 Node tests passed, including 15 adapter/host regressions.
- Agent runtime: 26 tests passed; GitHub Actions passed.
- Scene bundle regenerated with npm run build.
- Pinned module SHA-256 verification passed.
- Actual GitHub Pages prepare-site commands executed locally; referenced scripts, styles, assets and pinned modules exist; public endpoint configuration generated.
- New browser suite passed at 1440×1000 and 390×844: lazy connection, escaped assistant text, simulated microphone denial and text fallback, close/reopen/Escape, persistent panel across wizard redraw, layout bounds, actual quote changes and motor totals, undo, stale-revision rejection, preservation of unrelated pending quotes, scene controls without quote changes, and no-WebGL text operation.
- Existing campus browser suite passed desktop, mobile viewport, reduced motion and unavailable WebGL scenarios. Context loss/recovery, camera controls, animation lifecycle, quote updates and rendering budgets passed.
- Independent review found response-creation rejection recovery and unintended normalization/recalculation of pending quotes. Regression tests were added, fixes reviewed, all reported findings resolved.
- UI visually inspected from browser captures; advisory design-detector differences reflect the compact companion sizing and existing palette. Existing design sidecar is stale and was not regenerated.

## Limits

Browser tests ran in Chromium with SwiftShader. Mobile dimensions are emulation, not a physical-phone/GPU claim. Transport and microphone tests use mocks; no live OpenAI session or real microphone quality test was performed. No API key was configured in the execution environment and no backend was deployed.

Deploy the server and configure the public GEEKY_AGENT_ENDPOINT as described in geeky-agent.md, then run a credentialed text/voice acceptance test. Cotizador's complete manual flow is retained.

## Local evidence

Screenshots and reports are ignored under artifacts/geeky-agent/. The campus summary records passed:true. No conversations, credentials or user microphone recordings are included in this repository.
